import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDatabase(filename) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      tags TEXT NOT NULL DEFAULT '[]',
      visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
      moderation_status TEXT NOT NULL DEFAULT 'published' CHECK (moderation_status IN ('published', 'hidden', 'removed')),
      media_name TEXT,
      media_type TEXT,
      media_size INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, video_id)
    );

    CREATE TABLE IF NOT EXISTS saves (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, video_id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      subscriber_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (subscriber_id <> channel_id),
      PRIMARY KEY (subscriber_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, video_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      video_id TEXT REFERENCES videos(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS videos_feed_idx ON videos(moderation_status, visibility, created_at DESC);
    CREATE INDEX IF NOT EXISTS videos_owner_idx ON videos(owner_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS videos_search_idx ON videos(title, category, created_at DESC);
    CREATE INDEX IF NOT EXISTS comments_video_idx ON comments(video_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  `);
  return db;
}
