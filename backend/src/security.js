import { promisify } from 'node:util';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const digest = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${digest.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [saltHex, digestHex] = encoded.split(':');
  if (!saltHex || !digestHex) return false;
  const expected = Buffer.from(digestHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function issueToken(user, secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, role: user.role, iat: now, exp: now + TOKEN_TTL_SECONDS, jti: randomUUID() };
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return { token: `${unsigned}.${signature}`, sessionId: payload.jti, expiresAt: payload.exp };
}

export function verifyToken(token, secret) {
  const [header, body, signature, extra] = token.split('.');
  if (!header || !body || !signature || extra) return null;
  try {
    const metadata = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (metadata.alg !== 'HS256' || metadata.typ !== 'JWT') return null;
  } catch {
    return null;
  }
  const unsigned = `${header}.${body}`;
  const expected = createHmac('sha256', secret).update(unsigned).digest();
  const supplied = Buffer.from(signature, 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.sub || !payload.jti || !Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newId() {
  return randomUUID();
}
