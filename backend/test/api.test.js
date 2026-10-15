import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../src/server.js';
import { openDatabase } from '../src/database.js';

let server;
let db;
let base;
let tempDir;
let alice;
let bob;
let admin;

async function request(route, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body),
  });
  const json = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  return { response, json };
}

async function register(email, username, displayName = username, password = 'safePassword42') {
  const { response, json } = await request('/api/auth/register', { method: 'POST', body: { email, username, displayName, password } });
  assert.equal(response.status, 201, JSON.stringify(json));
  return json.data;
}

before(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'serein-api-'));
  const config = {
    host: '127.0.0.1', port: 0, jwtSecret: 'unit-test-secret-that-is-long-enough-for-hmac',
    databasePath: path.join(tempDir, 'db.sqlite'), mediaDir: path.join(tempDir, 'media'),
    maxUploadBytes: 1024 * 1024, corsOrigins: ['http://localhost:8081'],
  };
  db = openDatabase(config.databasePath);
  server = createApp({ config, db, onError: (error) => { throw error; } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  alice = await register('alice@example.test', 'alice', 'Alice');
  bob = await register('bob@example.test', 'bob', 'Bob');
  admin = await register('admin@example.test', 'admin', 'Admin');
  db.prepare("UPDATE users SET role='admin' WHERE email=?").run('admin@example.test');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  db?.close();
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

test('health, session and logout use consistent API envelopes', async () => {
  const health = await request('/health');
  assert.deepEqual(health.json.data, { status: 'ok' });
  const me = await request('/api/auth/me', { token: alice.token });
  assert.equal(me.json.data.user.username, 'alice');
  const loggedOut = await request('/api/auth/logout', { method: 'POST', token: alice.token });
  assert.equal(loggedOut.json.data.signedOut, true);
  const expiredSession = await request('/api/auth/me', { token: alice.token });
  assert.equal(expiredSession.response.status, 401);
  alice = await register('alice2@example.test', 'alice2', 'Alice');
});

test('registration validates data, hides password hashes and rejects duplicate accounts', async () => {
  const invalid = await request('/api/auth/register', { method: 'POST', body: { email: 'bad', username: 'x', password: 'weak' } });
  assert.equal(invalid.response.status, 422);
  const duplicate = await request('/api/auth/register', { method: 'POST', body: { email: 'bob@example.test', username: 'bob2', password: 'safePassword42' } });
  assert.equal(duplicate.response.status, 409);
  const login = await request('/api/auth/login', { method: 'POST', body: { email: 'bob@example.test', password: 'wrongPassword42' } });
  assert.equal(login.response.status, 401);
  assert.equal(Object.hasOwn((await request('/api/auth/me', { token: bob.token })).json.data.user, 'passwordHash'), false);
});

test('video upload, streaming range, feed and search work', async () => {
  const created = await request('/api/videos', { method: 'POST', token: bob.token, body: { title: 'Forest walk', description: 'A quiet walk', category: 'Nature', tags: ['walk', 'forest'] } });
  assert.equal(created.response.status, 201);
  const videoId = created.json.data.video.id;
  const bytes = Buffer.from('0000ftypisom0000sample-valid-mp4');
  const uploaded = await request(`/api/videos/${videoId}/media`, { method: 'PUT', token: bob.token, body: bytes, headers: { 'content-type': 'video/mp4' } });
  assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.json));
  const feed = await request('/api/videos');
  assert.equal(feed.json.data.items.length, 1);
  assert.equal(feed.json.data.items[0].title, 'Forest walk');
  const search = await request('/api/search?q=forest');
  assert.equal(search.json.data.videos.length, 1);
  const media = await fetch(`${base}/api/videos/${videoId}/media`, { headers: { range: 'bytes=4-9' } });
  assert.equal(media.status, 206);
  assert.equal(await media.text(), 'ftypis');
});

test('video ownership, comments, reactions, saves and channel subscriptions are enforced', async () => {
  const created = await request('/api/videos', { method: 'POST', token: bob.token, body: { title: 'Owner only edit' } });
  const videoId = created.json.data.video.id;
  const denied = await request(`/api/videos/${videoId}`, { method: 'PATCH', token: alice.token, body: { title: 'Changed by someone else' } });
  assert.equal(denied.response.status, 403);
  const comment = await request(`/api/videos/${videoId}/comments`, { method: 'POST', token: alice.token, body: { body: 'Nice work' } });
  assert.equal(comment.response.status, 201);
  const otherDelete = await request(`/api/videos/${videoId}/comments/${comment.json.data.comment.id}`, { method: 'DELETE', token: bob.token });
  assert.equal(otherDelete.response.status, 403);
  const like = await request(`/api/videos/${videoId}/like`, { method: 'POST', token: alice.token });
  assert.equal(like.json.data.liked, true);
  const save = await request(`/api/videos/${videoId}/save`, { method: 'POST', token: alice.token });
  assert.equal(save.json.data.saved, true);
  const subscribe = await request('/api/channels/bob/subscribe', { method: 'POST', token: alice.token });
  assert.equal(subscribe.json.data.subscribed, true);
  const saved = await request('/api/users/me/saved', { token: alice.token });
  assert.equal(saved.json.data.items[0].id, videoId);
  const notifications = await request('/api/notifications', { token: bob.token });
  assert.equal(notifications.json.data.unreadCount, 3);
});

test('admin controls reject regular users and permit configured administrators', async () => {
  const denied = await request('/api/admin/dashboard', { token: bob.token });
  assert.equal(denied.response.status, 403);
  const allowed = await request('/api/admin/dashboard', { token: admin.token });
  assert.equal(allowed.response.status, 200);
  assert.equal(typeof allowed.json.data.users, 'number');
});
