import http from 'node:http';
import path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config as defaultConfig, validateConfig } from './config.js';
import { openDatabase } from './database.js';
import { hashPassword, issueToken, newId, verifyPassword, verifyToken } from './security.js';

const JSON_LIMIT = 1024 * 1024;
const PAGE_DEFAULT = 20;
const PAGE_MAX = 50;
const VIDEO_TYPES = new Map([
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
]);

class HttpError extends Error {
  constructor(status, message, code = 'request_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asUser = (row) => row && ({
  id: row.id, username: row.username, displayName: row.display_name,
  bio: row.bio, role: row.role, createdAt: row.created_at,
});

const clampPage = (url) => {
  const limit = Math.min(PAGE_MAX, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? `${PAGE_DEFAULT}`, 10) || PAGE_DEFAULT));
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  return { limit, offset };
};

async function jsonBody(req, maxBytes = JSON_LIMIT) {
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > maxBytes) throw new HttpError(413, 'Request body is too large.', 'body_too_large');
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new HttpError(413, 'Request body is too large.', 'body_too_large');
    chunks.push(chunk);
  }
  if (!total) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, 'Send a valid JSON object.', 'invalid_json');
  }
}

function send(res, status, data, headers = {}) {
  if (res.writableEnded) return;
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', ...headers });
  res.end(body);
}

function ok(res, data, status = 200) {
  send(res, status, { data, error: null });
}

function fail(res, status, message, code = 'request_error') {
  send(res, status, { data: null, error: { code, message } });
}

function validateText(value, label, { min = 1, max = 3000, optional = false } = {}) {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string') throw new HttpError(422, `${label} must be text.`, 'validation_error');
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new HttpError(422, `${label} must be between ${min} and ${max} characters.`, 'validation_error');
  }
  return normalized;
}

function publicVideo(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    tags: JSON.parse(row.tags),
    visibility: row.visibility,
    views: row.views,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    mediaUrl: row.media_name ? `/api/videos/${row.id}/media` : null,
    createdAt: row.created_at,
    channel: { id: row.owner_id, username: row.username, displayName: row.display_name },
  };
}

const VIDEO_SELECT = `SELECT v.*, u.username, u.display_name,
  (SELECT COUNT(*) FROM likes l WHERE l.video_id=v.id) AS like_count,
  (SELECT COUNT(*) FROM comments c WHERE c.video_id=v.id) AS comment_count
  FROM videos v JOIN users u ON u.id=v.owner_id`;

function contentResponse(req, res, user, row, config) {
  if (!row || !row.media_name) throw new HttpError(404, 'Video file not found.', 'not_found');
  if (row.visibility === 'private' && user?.id !== row.owner_id) throw new HttpError(404, 'Video not found.', 'not_found');
  const filePath = path.resolve(config.mediaDir, row.media_name);
  const size = Number(row.media_size ?? 0);
  const range = req.headers.range;
  res.setHeader('content-type', row.media_type ?? 'application/octet-stream');
  res.setHeader('accept-ranges', 'bytes');
  res.setHeader('cache-control', 'private, max-age=300');
  res.setHeader('x-content-type-options', 'nosniff');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) throw new HttpError(416, 'Invalid byte range.', 'invalid_range');
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[2] && match[1] ? Number(match[2]) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` });
      res.end();
      return;
    }
    end = Math.min(end, size - 1);
    res.writeHead(206, { 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${size}` });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-length': size });
  createReadStream(filePath).pipe(res);
}

export function createApp({ config = defaultConfig, db = openDatabase(config.databasePath), onError = console.error } = {}) {
  const attempts = new Map();
  const query = (sql, ...params) => db.prepare(sql).get(...params);
  const all = (sql, ...params) => db.prepare(sql).all(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  const getVideo = (id) => query(`${VIDEO_SELECT} WHERE v.id=? AND v.moderation_status='published'`, id);
  const notify = (userId, actorId, videoId, kind, message) => {
    if (userId && userId !== actorId) run('INSERT INTO notifications(id,user_id,actor_id,video_id,kind,message) VALUES(?,?,?,?,?,?)', newId(), userId, actorId, videoId ?? null, kind, message);
  };
  const cleanExpiredSessions = () => run('DELETE FROM sessions WHERE expires_at < ?', Math.floor(Date.now() / 1000));

  function getCurrentUser(req, required = false) {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      if (required) throw new HttpError(401, 'Sign in to continue.', 'authentication_required');
      return null;
    }
    const payload = verifyToken(header.slice(7), config.jwtSecret);
    if (!payload) throw new HttpError(401, 'Your session is invalid or expired. Sign in again.', 'invalid_session');
    const session = query('SELECT 1 AS ok FROM sessions WHERE id=? AND user_id=? AND expires_at>?', payload.jti, payload.sub, Math.floor(Date.now() / 1000));
    const row = query('SELECT * FROM users WHERE id=?', payload.sub);
    if (!session || !row || row.status !== 'active') throw new HttpError(401, 'Your session is no longer active.', 'invalid_session');
    return row;
  }

  function requireAdmin(user) {
    if (user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.', 'forbidden');
  }

  const handler = async (req, res) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes('*')) {
      res.setHeader('access-control-allow-origin', '*');
    } else if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
    } else if (origin && !config.corsOrigins.includes(origin)) {
      fail(res, 403, 'This app origin is not allowed by CORS.', 'origin_denied');
      return;
    }
    res.setHeader('access-control-allow-headers', 'authorization,content-type,range,x-upload-filename');
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const method = req.method ?? 'GET';

    if (method === 'GET' && pathname === '/health') { ok(res, { status: 'ok' }); return; }

    if (parts[0] === 'api' && parts[1] === 'auth') {
      const authPath = parts[2];
      if ((method === 'POST' && ['register', 'login'].includes(authPath))) {
        const now = Date.now();
        const ip = req.socket.remoteAddress ?? 'unknown';
        const key = `${ip}:${authPath}`;
        const prior = attempts.get(key);
        if (prior && now - prior.startedAt < 15 * 60_000 && prior.count >= 10) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.', 'rate_limited');
        if (!prior || now - prior.startedAt >= 15 * 60_000) attempts.set(key, { startedAt: now, count: 1 });
        else prior.count++;
        const body = await jsonBody(req);
        if (authPath === 'register') {
          const email = validateText(body.email, 'Email', { max: 254 }).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, 'Enter a valid email address.', 'validation_error');
          const username = validateText(body.username, 'Username', { min: 3, max: 24 }).toLowerCase();
          if (!/^[a-z0-9_]+$/.test(username)) throw new HttpError(422, 'Username can use lowercase letters, numbers, and underscores.', 'validation_error');
          const displayName = validateText(body.displayName ?? username, 'Display name', { max: 60 });
          const password = validateText(body.password, 'Password', { min: 10, max: 128 });
          if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new HttpError(422, 'Password must include a letter and a number.', 'validation_error');
          if (query('SELECT 1 FROM users WHERE email=? OR username=?', email, username)) throw new HttpError(409, 'That email or username is already registered.', 'already_exists');
          const id = newId();
          run('INSERT INTO users(id,email,username,display_name,password_hash) VALUES(?,?,?,?,?)', id, email, username, displayName, await hashPassword(password));
          const user = query('SELECT * FROM users WHERE id=?', id);
          const auth = issueToken(user, config.jwtSecret);
          run('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)', auth.sessionId, id, auth.expiresAt);
          ok(res, { token: auth.token, expiresAt: auth.expiresAt, user: asUser(user) }, 201);
          return;
        }
        const email = validateText(body.email, 'Email', { max: 254 }).toLowerCase();
        const user = query('SELECT * FROM users WHERE email=?', email);
        if (!user || !(await verifyPassword(String(body.password ?? ''), user.password_hash)) || user.status !== 'active') {
          throw new HttpError(401, 'Email or password is incorrect.', 'invalid_credentials');
        }
        const auth = issueToken(user, config.jwtSecret);
        run('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)', auth.sessionId, user.id, auth.expiresAt);
        ok(res, { token: auth.token, expiresAt: auth.expiresAt, user: asUser(user) });
        return;
      }
      if (method === 'GET' && authPath === 'me') {
        const user = getCurrentUser(req, true);
        ok(res, { user: asUser(user) });
        return;
      }
      if (method === 'POST' && authPath === 'logout') {
        const user = getCurrentUser(req, true);
        const payload = verifyToken(req.headers.authorization.slice(7), config.jwtSecret);
        run('DELETE FROM sessions WHERE id=? AND user_id=?', payload.jti, user.id);
        ok(res, { signedOut: true });
        return;
      }
    }

    const currentUser = getCurrentUser(req, false);

    if (parts[0] === 'api' && parts[1] === 'users' && parts[2] === 'me') {
      if (!currentUser) throw new HttpError(401, 'Sign in to continue.', 'authentication_required');
      if (method === 'PATCH' && parts.length === 3) {
        const body = await jsonBody(req);
        const displayName = body.displayName === undefined ? currentUser.display_name : validateText(body.displayName, 'Display name', { max: 60 });
        const bio = body.bio === undefined ? currentUser.bio : validateText(body.bio, 'Bio', { min: 0, max: 500 });
        run('UPDATE users SET display_name=?,bio=? WHERE id=?', displayName, bio, currentUser.id);
        ok(res, { user: asUser(query('SELECT * FROM users WHERE id=?', currentUser.id)) });
        return;
      }
      if (method === 'GET' && parts[3] === 'history') {
        const { limit, offset } = clampPage(url);
        const rows = all(`${VIDEO_SELECT} JOIN watch_history h ON h.video_id=v.id
          WHERE h.user_id=? ORDER BY h.watched_at DESC LIMIT ? OFFSET ?`, currentUser.id, limit, offset);
        ok(res, { items: rows.map(publicVideo), limit, offset });
        return;
      }
      if (method === 'GET' && parts[3] === 'saved') {
        const { limit, offset } = clampPage(url);
        const rows = all(`${VIDEO_SELECT} JOIN saves s ON s.video_id=v.id
          WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT ? OFFSET ?`, currentUser.id, limit, offset);
        ok(res, { items: rows.map(publicVideo), limit, offset });
        return;
      }
      if (method === 'GET' && parts[3] === 'liked') {
        const { limit, offset } = clampPage(url);
        const rows = all(`${VIDEO_SELECT} JOIN likes l ON l.video_id=v.id
          WHERE l.user_id=? ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, currentUser.id, limit, offset);
        ok(res, { items: rows.map(publicVideo), limit, offset });
        return;
      }
      if (method === 'GET' && parts[3] === 'videos') {
        const { limit, offset } = clampPage(url);
        const rows = all(`${VIDEO_SELECT} WHERE v.owner_id=? ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, currentUser.id, limit, offset);
        ok(res, { items: rows.map(publicVideo), limit, offset });
        return;
      }
      if (method === 'GET' && parts[3] === 'subscriptions') {
        const rows = all(`SELECT u.id,u.username,u.display_name,u.bio,u.created_at,
          (SELECT COUNT(*) FROM subscriptions s2 WHERE s2.channel_id=u.id) AS subscriber_count
          FROM subscriptions s JOIN users u ON u.id=s.channel_id WHERE s.subscriber_id=? ORDER BY s.created_at DESC`, currentUser.id);
        ok(res, { items: rows.map((row) => ({ id: row.id, username: row.username, displayName: row.display_name, bio: row.bio, subscriberCount: row.subscriber_count })) });
        return;
      }
    }

    if (parts[0] === 'api' && parts[1] === 'search' && method === 'GET') {
      const term = (url.searchParams.get('q') ?? '').trim();
      if (term.length < 2) { ok(res, { videos: [], channels: [], limit: PAGE_DEFAULT, offset: 0 }); return; }
      if (term.length > 100) throw new HttpError(422, 'Search is limited to 100 characters.', 'validation_error');
      const { limit, offset } = clampPage(url);
      const needle = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
      const videos = all(`${VIDEO_SELECT} WHERE v.moderation_status='published' AND v.visibility='public'
        AND (v.title LIKE ? ESCAPE '\\' OR v.description LIKE ? ESCAPE '\\' OR v.category LIKE ? ESCAPE '\\')
        ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, needle, needle, needle, limit, offset);
      const channels = all(`SELECT u.id,u.username,u.display_name,u.bio,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.channel_id=u.id) AS subscriber_count
        FROM users u WHERE u.status='active' AND (u.username LIKE ? OR u.display_name LIKE ?) LIMIT ?`, needle, needle, 10);
      ok(res, { videos: videos.map(publicVideo), channels: channels.map((row) => ({ id: row.id, username: row.username, displayName: row.display_name, bio: row.bio, subscriberCount: row.subscriber_count })), limit, offset });
      return;
    }

    if (parts[0] === 'api' && parts[1] === 'channels' && parts[2]) {
      const username = parts[2].toLowerCase();
      const channel = query(`SELECT u.id,u.username,u.display_name,u.bio,u.created_at,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.channel_id=u.id) AS subscriber_count,
        (SELECT COUNT(*) FROM videos v WHERE v.owner_id=u.id AND v.visibility='public' AND v.moderation_status='published' AND v.media_name IS NOT NULL) AS video_count
        FROM users u WHERE u.username=? AND u.status='active'`, username);
      if (!channel) throw new HttpError(404, 'Channel not found.', 'not_found');
      if (method === 'GET' && parts.length === 3) {
        ok(res, { id: channel.id, username: channel.username, displayName: channel.display_name, bio: channel.bio, createdAt: channel.created_at, subscriberCount: channel.subscriber_count, videoCount: channel.video_count, isSubscribed: Boolean(currentUser && query('SELECT 1 FROM subscriptions WHERE subscriber_id=? AND channel_id=?', currentUser.id, channel.id)) });
        return;
      }
      if (method === 'GET' && parts[3] === 'videos') {
        const { limit, offset } = clampPage(url);
        const own = currentUser?.id === channel.id;
        const rows = all(`${VIDEO_SELECT} WHERE v.owner_id=? AND v.moderation_status='published'
          AND v.media_name IS NOT NULL ${own ? '' : "AND v.visibility='public'"}
          ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, channel.id, limit, offset);
        ok(res, { items: rows.map(publicVideo), limit, offset });
        return;
      }
      if (method === 'POST' && parts[3] === 'subscribe') {
        if (!currentUser) throw new HttpError(401, 'Sign in to continue.', 'authentication_required');
        if (currentUser.id === channel.id) throw new HttpError(409, 'You cannot subscribe to your own channel.', 'invalid_action');
        const existing = query('SELECT 1 FROM subscriptions WHERE subscriber_id=? AND channel_id=?', currentUser.id, channel.id);
        if (existing) run('DELETE FROM subscriptions WHERE subscriber_id=? AND channel_id=?', currentUser.id, channel.id);
        else {
          run('INSERT INTO subscriptions(subscriber_id,channel_id) VALUES(?,?)', currentUser.id, channel.id);
          notify(channel.id, currentUser.id, null, 'subscription', `${currentUser.display_name} subscribed to your channel.`);
        }
        ok(res, { subscribed: !existing, subscriberCount: query('SELECT COUNT(*) AS n FROM subscriptions WHERE channel_id=?', channel.id).n });
        return;
      }
    }

    if (parts[0] === 'api' && parts[1] === 'videos') {
      if (parts.length === 2 && method === 'GET') {
        const { limit, offset } = clampPage(url);
        const category = url.searchParams.get('category');
        const order = url.searchParams.get('sort') === 'popular' ? 'v.views DESC, v.created_at DESC' : 'v.created_at DESC';
        const rows = category && category !== 'All'
          ? all(`${VIDEO_SELECT} WHERE v.visibility='public' AND v.moderation_status='published' AND v.media_name IS NOT NULL AND v.category=? ORDER BY ${order} LIMIT ? OFFSET ?`, category, limit, offset)
          : all(`${VIDEO_SELECT} WHERE v.visibility='public' AND v.moderation_status='published' AND v.media_name IS NOT NULL ORDER BY ${order} LIMIT ? OFFSET ?`, limit, offset);
        ok(res, { items: rows.map(publicVideo), limit, offset });
        return;
      }
      if (parts.length === 2 && method === 'POST') {
        if (!currentUser) throw new HttpError(401, 'Sign in to upload a video.', 'authentication_required');
        const body = await jsonBody(req);
        const title = validateText(body.title, 'Title', { max: 120 });
        const description = validateText(body.description ?? '', 'Description', { min: 0, max: 5000 });
        const category = validateText(body.category ?? 'General', 'Category', { max: 40 });
        const visibility = body.visibility ?? 'public';
        if (!['public', 'unlisted', 'private'].includes(visibility)) throw new HttpError(422, 'Visibility must be public, unlisted, or private.', 'validation_error');
        const tags = body.tags ?? [];
        if (!Array.isArray(tags) || tags.length > 20 || tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 30)) throw new HttpError(422, 'Use up to 20 tags, each 30 characters or fewer.', 'validation_error');
        const id = newId();
        run('INSERT INTO videos(id,owner_id,title,description,category,tags,visibility) VALUES(?,?,?,?,?,?,?)', id, currentUser.id, title, description, category, JSON.stringify([...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]), visibility);
        ok(res, { video: publicVideo({ ...query(`${VIDEO_SELECT} WHERE v.id=?`, id), media_size: 0 }) }, 201);
        return;
      }
      const videoId = parts[2];
      if (!videoId) throw new HttpError(404, 'Route not found.', 'not_found');
      const row = query(`${VIDEO_SELECT} WHERE v.id=?`, videoId);
      if (!row || row.moderation_status === 'removed' || row.moderation_status === 'hidden') throw new HttpError(404, 'Video not found.', 'not_found');
      const owner = currentUser?.id === row.owner_id;
      if (row.visibility === 'private' && !owner) throw new HttpError(404, 'Video not found.', 'not_found');

      if (parts[3] === 'media' && method === 'PUT') {
        if (!currentUser || !owner) throw new HttpError(403, 'Only the channel owner can upload this video.', 'forbidden');
        const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
        const extension = VIDEO_TYPES.get(type);
        if (!extension) throw new HttpError(415, 'Upload an MP4 or WebM video.', 'unsupported_media_type');
        const declared = Number(req.headers['content-length'] ?? 0);
        if (declared > config.maxUploadBytes) throw new HttpError(413, `Video must be smaller than ${Math.floor(config.maxUploadBytes / 1024 / 1024)} MB.`, 'upload_too_large');
        await mkdir(config.mediaDir, { recursive: true });
        const mediaName = `${videoId}${extension}`;
        const destination = path.resolve(config.mediaDir, mediaName);
        const temporary = `${destination}.part`;
        let total = 0;
        const limiter = new Transform({ transform(chunk, _encoding, callback) {
          total += chunk.length;
          if (total > config.maxUploadBytes) callback(new HttpError(413, `Video must be smaller than ${Math.floor(config.maxUploadBytes / 1024 / 1024)} MB.`, 'upload_too_large'));
          else callback(null, chunk);
        } });
        try {
          await pipeline(req, limiter, createWriteStream(temporary, { flags: 'wx' }));
          if (total < 32) throw new HttpError(422, 'The selected video file is empty or invalid.', 'invalid_upload');
          const handle = await open(temporary, 'r');
          const signature = Buffer.alloc(16);
          await handle.read(signature, 0, signature.length, 0);
          await handle.close();
          const validSignature = type === 'video/mp4'
            ? signature.toString('ascii', 4, 8) === 'ftyp'
            : signature.readUInt32BE(0) === 0x1a45dfa3;
          if (!validSignature) throw new HttpError(415, 'The file contents do not match the selected video format.', 'invalid_media');
          await rename(temporary, destination);
          run('UPDATE videos SET media_name=?,media_type=?,media_size=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', mediaName, type, total, videoId);
        } catch (error) {
          await rm(temporary, { force: true }).catch(() => {});
          throw error;
        }
        ok(res, { video: publicVideo(query(`${VIDEO_SELECT} WHERE v.id=?`, videoId)) });
        return;
      }
      if (parts[3] === 'media' && method === 'GET') {
        if (!row.media_name) throw new HttpError(404, 'Video file not found.', 'not_found');
        if (currentUser && !owner) run('INSERT INTO watch_history(user_id,video_id,watched_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,video_id) DO UPDATE SET watched_at=CURRENT_TIMESTAMP', currentUser.id, videoId);
        contentResponse(req, res, currentUser, row, config);
        return;
      }
      if (parts.length === 3 && method === 'GET') {
        if (row.visibility === 'private' && !owner) throw new HttpError(404, 'Video not found.', 'not_found');
        if (row.visibility === 'public') run('UPDATE videos SET views=views+1 WHERE id=?', videoId);
        if (currentUser) run('INSERT INTO watch_history(user_id,video_id,watched_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,video_id) DO UPDATE SET watched_at=CURRENT_TIMESTAMP', currentUser.id, videoId);
        const liked = currentUser && query('SELECT 1 FROM likes WHERE user_id=? AND video_id=?', currentUser.id, videoId);
        const saved = currentUser && query('SELECT 1 FROM saves WHERE user_id=? AND video_id=?', currentUser.id, videoId);
        ok(res, { video: publicVideo(query(`${VIDEO_SELECT} WHERE v.id=?`, videoId)), liked: Boolean(liked), saved: Boolean(saved) });
        return;
      }
      if (parts.length === 3 && method === 'PATCH') {
        if (!currentUser || !owner) throw new HttpError(403, 'Only the channel owner can edit this video.', 'forbidden');
        const body = await jsonBody(req);
        const title = body.title === undefined ? row.title : validateText(body.title, 'Title', { max: 120 });
        const description = body.description === undefined ? row.description : validateText(body.description, 'Description', { min: 0, max: 5000 });
        const category = body.category === undefined ? row.category : validateText(body.category, 'Category', { max: 40 });
        const visibility = body.visibility === undefined ? row.visibility : body.visibility;
        if (!['public', 'unlisted', 'private'].includes(visibility)) throw new HttpError(422, 'Visibility must be public, unlisted, or private.', 'validation_error');
        run('UPDATE videos SET title=?,description=?,category=?,visibility=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', title, description, category, visibility, videoId);
        ok(res, { video: publicVideo(query(`${VIDEO_SELECT} WHERE v.id=?`, videoId)) });
        return;
      }
      if (parts.length === 3 && method === 'DELETE') {
        if (!currentUser || !owner) throw new HttpError(403, 'Only the channel owner can delete this video.', 'forbidden');
        if (row.media_name) await rm(path.resolve(config.mediaDir, row.media_name), { force: true });
        run('DELETE FROM videos WHERE id=?', videoId);
        ok(res, { deleted: true });
        return;
      }
      if (parts[3] === 'like' && method === 'POST') {
        if (!currentUser) throw new HttpError(401, 'Sign in to react to videos.', 'authentication_required');
        const existing = query('SELECT 1 FROM likes WHERE user_id=? AND video_id=?', currentUser.id, videoId);
        if (existing) run('DELETE FROM likes WHERE user_id=? AND video_id=?', currentUser.id, videoId);
        else {
          run('INSERT INTO likes(user_id,video_id) VALUES(?,?)', currentUser.id, videoId);
          notify(row.owner_id, currentUser.id, videoId, 'like', `${currentUser.display_name} liked “${row.title}”.`);
        }
        ok(res, { liked: !existing, likeCount: query('SELECT COUNT(*) AS n FROM likes WHERE video_id=?', videoId).n });
        return;
      }
      if (parts[3] === 'save' && method === 'POST') {
        if (!currentUser) throw new HttpError(401, 'Sign in to save videos.', 'authentication_required');
        const existing = query('SELECT 1 FROM saves WHERE user_id=? AND video_id=?', currentUser.id, videoId);
        if (existing) run('DELETE FROM saves WHERE user_id=? AND video_id=?', currentUser.id, videoId);
        else run('INSERT INTO saves(user_id,video_id) VALUES(?,?)', currentUser.id, videoId);
        ok(res, { saved: !existing });
        return;
      }
      if (parts[3] === 'report' && method === 'POST') {
        if (!currentUser) throw new HttpError(401, 'Sign in to report a video.', 'authentication_required');
        const body = await jsonBody(req);
        const reason = validateText(body.reason, 'Report reason', { max: 500 });
        run('INSERT INTO reports(id,reporter_id,video_id,reason) VALUES(?,?,?,?)', newId(), currentUser.id, videoId, reason);
        ok(res, { reported: true }, 201);
        return;
      }
      if (parts[3] === 'comments' && parts.length === 4 && method === 'GET') {
        const { limit, offset } = clampPage(url);
        const rows = all(`SELECT c.*,u.username,u.display_name FROM comments c JOIN users u ON u.id=c.author_id
          WHERE c.video_id=? ORDER BY c.created_at DESC LIMIT ? OFFSET ?`, videoId, limit, offset);
        ok(res, { items: rows.map((comment) => ({ id: comment.id, videoId: comment.video_id, parentId: comment.parent_id, body: comment.body, createdAt: comment.created_at, updatedAt: comment.updated_at, author: { id: comment.author_id, username: comment.username, displayName: comment.display_name } })), limit, offset });
        return;
      }
      if (parts[3] === 'comments' && parts.length === 4 && method === 'POST') {
        if (!currentUser) throw new HttpError(401, 'Sign in to comment.', 'authentication_required');
        const body = await jsonBody(req);
        const text = validateText(body.body, 'Comment', { max: 2000 });
        const parentId = body.parentId ? validateText(body.parentId, 'Reply target', { max: 64 }) : null;
        if (parentId && !query('SELECT 1 FROM comments WHERE id=? AND video_id=?', parentId, videoId)) throw new HttpError(404, 'The comment you are replying to was not found.', 'not_found');
        const id = newId();
        run('INSERT INTO comments(id,video_id,author_id,parent_id,body) VALUES(?,?,?,?,?)', id, videoId, currentUser.id, parentId, text);
        notify(row.owner_id, currentUser.id, videoId, 'comment', `${currentUser.display_name} commented on “${row.title}”.`);
        ok(res, { comment: { id, videoId, parentId, body: text, author: asUser(currentUser) } }, 201);
        return;
      }
      if (parts[3] === 'comments' && parts[4] && ['PATCH', 'DELETE'].includes(method)) {
        if (!currentUser) throw new HttpError(401, 'Sign in to continue.', 'authentication_required');
        const comment = query('SELECT * FROM comments WHERE id=? AND video_id=?', parts[4], videoId);
        if (!comment) throw new HttpError(404, 'Comment not found.', 'not_found');
        if (comment.author_id !== currentUser.id && currentUser.role !== 'admin') throw new HttpError(403, 'You can only edit or delete your own comment.', 'forbidden');
        if (method === 'DELETE') { run('DELETE FROM comments WHERE id=?', comment.id); ok(res, { deleted: true }); return; }
        const body = await jsonBody(req);
        const text = validateText(body.body, 'Comment', { max: 2000 });
        run('UPDATE comments SET body=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', text, comment.id);
        ok(res, { comment: { id: comment.id, videoId, body: text, updatedAt: new Date().toISOString() } });
        return;
      }
    }

    if (parts[0] === 'api' && parts[1] === 'notifications') {
      if (!currentUser) throw new HttpError(401, 'Sign in to view notifications.', 'authentication_required');
      if (method === 'GET' && parts.length === 2) {
        const { limit, offset } = clampPage(url);
        const rows = all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?', currentUser.id, limit, offset);
        ok(res, { items: rows.map((n) => ({ id: n.id, kind: n.kind, message: n.message, videoId: n.video_id, actorId: n.actor_id, readAt: n.read_at, createdAt: n.created_at })), unreadCount: query('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read_at IS NULL', currentUser.id).n, limit, offset });
        return;
      }
      if (method === 'POST' && parts[2] === 'read-all') {
        run('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL', currentUser.id);
        ok(res, { updated: true });
        return;
      }
      if (method === 'POST' && parts[2] && parts[3] === 'read') {
        run('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?', parts[2], currentUser.id);
        ok(res, { updated: true });
        return;
      }
    }

    if (parts[0] === 'api' && parts[1] === 'admin') {
      if (!currentUser) throw new HttpError(401, 'Sign in to continue.', 'authentication_required');
      requireAdmin(currentUser);
      if (method === 'GET' && parts[2] === 'dashboard') {
        ok(res, {
          users: query('SELECT COUNT(*) AS n FROM users').n,
          usersActive: query("SELECT COUNT(*) AS n FROM users WHERE status='active'").n,
          usersDisabled: query("SELECT COUNT(*) AS n FROM users WHERE status='disabled'").n,
          videos: query('SELECT COUNT(*) AS n FROM videos').n,
          videosHidden: query("SELECT COUNT(*) AS n FROM videos WHERE moderation_status IN ('hidden','removed')").n,
          reportsOpen: query("SELECT COUNT(*) AS n FROM reports WHERE status='open'").n,
          comments: query('SELECT COUNT(*) AS n FROM comments').n,
        });
        return;
      }
      if (method === 'GET' && parts[2] === 'reports') {
        const { limit, offset } = clampPage(url);
        const status = url.searchParams.get('status') ?? 'open';
        if (!['all', 'open', 'resolved', 'dismissed'].includes(status)) throw new HttpError(422, 'Choose a valid report status.', 'validation_error');
        const where = status === 'all' ? '' : 'WHERE r.status=?';
        const params = status === 'all' ? [] : [status];
        const total = query(`SELECT COUNT(*) AS n FROM reports r ${where}`, ...params).n;
        const items = all(`SELECT r.id,r.reporter_id,r.video_id,r.reason,r.status,r.created_at,
            reporter.username AS reporter_username,reporter.display_name AS reporter_display_name,
            v.title AS video_title,v.owner_id,owner.username AS owner_username,owner.display_name AS owner_display_name
          FROM reports r JOIN users reporter ON reporter.id=r.reporter_id
          JOIN videos v ON v.id=r.video_id JOIN users owner ON owner.id=v.owner_id
          ${where} ORDER BY CASE WHEN r.status='open' THEN 0 ELSE 1 END,r.created_at DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
        ok(res, { items: items.map((row) => ({
          id: row.id, reporterId: row.reporter_id, reporterUsername: row.reporter_username,
          reporterDisplayName: row.reporter_display_name, videoId: row.video_id, videoTitle: row.video_title,
          ownerId: row.owner_id, ownerUsername: row.owner_username, ownerDisplayName: row.owner_display_name,
          reason: row.reason, status: row.status, createdAt: row.created_at,
        })), total, limit, offset });
        return;
      }
      if (method === 'PATCH' && parts[2] === 'reports' && parts[3]) {
        const body = await jsonBody(req);
        if (!['open', 'resolved', 'dismissed'].includes(body.status)) throw new HttpError(422, 'Choose open, resolved, or dismissed.', 'validation_error');
        if (!query('SELECT 1 AS ok FROM reports WHERE id=?', parts[3])) throw new HttpError(404, 'Report not found.', 'not_found');
        run('UPDATE reports SET status=? WHERE id=?', body.status, parts[3]);
        ok(res, { updated: true, status: body.status });
        return;
      }
      if (method === 'GET' && parts[2] === 'videos') {
        const { limit, offset } = clampPage(url);
        const status = url.searchParams.get('status') ?? 'all';
        const search = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
        if (!['all', 'published', 'hidden', 'removed'].includes(status)) throw new HttpError(422, 'Choose a valid moderation status.', 'validation_error');
        const where = [];
        const params = [];
        if (status !== 'all') { where.push('v.moderation_status=?'); params.push(status); }
        if (search) { where.push('(v.title LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const total = query(`SELECT COUNT(*) AS n FROM videos v JOIN users u ON u.id=v.owner_id ${clause}`, ...params).n;
        const rows = all(`${VIDEO_SELECT} ${clause} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
        ok(res, { items: rows.map((row) => ({
          ...publicVideo(row), moderationStatus: row.moderation_status,
          hasMedia: Boolean(row.media_name), owner: { id: row.owner_id, username: row.username, displayName: row.display_name },
        })), total, limit, offset });
        return;
      }
      if (method === 'GET' && parts[2] === 'users') {
        const { limit, offset } = clampPage(url);
        const status = url.searchParams.get('status') ?? 'all';
        const search = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
        if (!['all', 'active', 'disabled'].includes(status)) throw new HttpError(422, 'Choose a valid user status.', 'validation_error');
        const where = [];
        const params = [];
        if (status !== 'all') { where.push('u.status=?'); params.push(status); }
        if (search) { where.push('(u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const total = query(`SELECT COUNT(*) AS n FROM users u ${clause}`, ...params).n;
        const rows = all(`SELECT u.id,u.email,u.username,u.display_name,u.role,u.status,u.created_at,
            (SELECT COUNT(*) FROM videos v WHERE v.owner_id=u.id) AS video_count
          FROM users u ${clause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
        ok(res, { items: rows.map((row) => ({
          id: row.id, email: row.email, username: row.username, displayName: row.display_name,
          role: row.role, status: row.status, createdAt: row.created_at, videoCount: row.video_count,
        })), total, limit, offset });
        return;
      }
      if (method === 'PATCH' && parts[2] === 'videos' && parts[3]) {
        const body = await jsonBody(req);
        if (!['published', 'hidden', 'removed'].includes(body.moderationStatus)) throw new HttpError(422, 'Choose published, hidden, or removed.', 'validation_error');
        if (!query('SELECT 1 AS ok FROM videos WHERE id=?', parts[3])) throw new HttpError(404, 'Video not found.', 'not_found');
        run('UPDATE videos SET moderation_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', body.moderationStatus, parts[3]);
        ok(res, { updated: true });
        return;
      }
      if (method === 'PATCH' && parts[2] === 'users' && parts[3]) {
        const body = await jsonBody(req);
        if (!['active', 'disabled'].includes(body.status)) throw new HttpError(422, 'Choose active or disabled.', 'validation_error');
        if (parts[3] === currentUser.id) throw new HttpError(409, 'An administrator cannot disable their own account.', 'invalid_action');
        if (!query('SELECT 1 AS ok FROM users WHERE id=?', parts[3])) throw new HttpError(404, 'User not found.', 'not_found');
        run('UPDATE users SET status=? WHERE id=?', body.status, parts[3]);
        if (body.status === 'disabled') run('DELETE FROM sessions WHERE user_id=?', parts[3]);
        ok(res, { updated: true });
        return;
      }
    }

    throw new HttpError(404, 'Route not found.', 'not_found');
  };

  const server = http.createServer((req, res) => {
    handler(req, res).catch((error) => {
      if (res.headersSent) { res.destroy(error); return; }
      if (error instanceof HttpError) { fail(res, error.status, error.message, error.code); return; }
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') { fail(res, 409, 'That email or username is already registered.', 'already_exists'); return; }
      onError(error);
      fail(res, 500, 'Something went wrong. Please try again.', 'internal_error');
    });
  });

  server.database = db;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  validateConfig();
  const db = openDatabase(defaultConfig.databasePath);
  const server = createApp({ db, config: defaultConfig });
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
  server.listen(defaultConfig.port, defaultConfig.host, () => {
    console.log(`Serein API listening on http://${defaultConfig.host}:${defaultConfig.port}`);
  });
  const shutdown = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
