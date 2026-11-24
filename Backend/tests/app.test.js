import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

// Force a deterministic configuration failure so health diagnostics can be tested
// without relying on a real Atlas account or network access.
process.env.MONGODB_URI = 'not-a-mongodb-uri';
const { createApp } = await import('../src/app.js');
let server;
let base;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('health endpoint remains reachable and explains database failure', async () => {
  const response = await fetch(`${base}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.database, 'disconnected');
  assert.match(body.detail, /MONGODB_URI must start/);
});

test('unknown API path returns JSON 404', async () => {
  const response = await fetch(`${base}/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { detail: 'Not found' });
});

test('malformed JSON returns 400 instead of crashing the API', async () => {
  const response = await fetch(`${base}/api/patients`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad json',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { detail: 'Invalid JSON body' });
});


test('liveness endpoint returns 200 without requiring MongoDB', async () => {
  const response = await fetch(`${base}/api/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'caresphere-api' });
});

test('allowed local frontend origin receives CORS headers', async () => {
  const response = await fetch(`${base}/api/health/live`, {
    headers: { Origin: 'http://localhost:5173' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

test('unconfigured browser origin is rejected with an actionable status', async () => {
  const response = await fetch(`${base}/api/health/live`, {
    headers: { Origin: 'https://not-allowed.example' },
  });
  assert.equal(response.status, 403);
  assert.match((await response.json()).detail, /not listed in CORS_ORIGINS/);
});
