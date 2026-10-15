import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: parsePositiveInt(process.env.PORT, 8000),
  jwtSecret: process.env.JWT_SECRET ?? '',
  databasePath: path.resolve(root, process.env.DATABASE_PATH ?? './data/serein.sqlite'),
  mediaDir: path.resolve(root, process.env.MEDIA_DIR ?? './media'),
  maxUploadBytes: parsePositiveInt(process.env.MAX_UPLOAD_BYTES, 50 * 1024 * 1024),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://127.0.0.1:8081')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
};

export function validateConfig() {
  if (config.jwtSecret.length < 32 || config.jwtSecret.startsWith('replace-')) {
    throw new Error('Set JWT_SECRET to a random value with at least 32 characters in backend/.env.');
  }
}
