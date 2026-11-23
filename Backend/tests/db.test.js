import test from 'node:test';
import assert from 'node:assert/strict';
import { hint, isLocalUri, validateUri } from '../src/db.js';

test('validateUri accepts MongoDB URI schemes', () => {
  assert.doesNotThrow(() => validateUri('mongodb://127.0.0.1:27017/test'));
  assert.doesNotThrow(() => validateUri('mongodb+srv://user:pass@example.mongodb.net/test'));
});

test('validateUri rejects placeholders and disabled TLS', () => {
  assert.throws(() => validateUri('mongodb+srv://<user>:<pass>@host.mongodb.net'), /placeholders/);
  assert.throws(() => validateUri('mongodb+srv://user:pass@host.mongodb.net/?tlsInsecure=true'), /disables TLS/);
});

test('isLocalUri distinguishes localhost from Atlas', () => {
  assert.equal(isLocalUri('mongodb://127.0.0.1:27017/test'), true);
  assert.equal(isLocalUri('mongodb://localhost/test'), true);
  assert.equal(isLocalUri('mongodb+srv://cluster.mongodb.net/test'), false);
});

test('hint gives safe, actionable authentication guidance', () => {
  assert.match(hint(new Error('Authentication failed')), /URL-encode special characters/);
});
