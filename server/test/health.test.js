'use strict';

// Smoke tests for the API skeleton.
// No database needed. Run with: npm test

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const createApp = require('../src/app');

describe('health', () => {
  let server;
  let base;

  before(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it('GET /api/health returns the ok envelope', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('x-request-id'), 'missing x-request-id header');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.service, 'hackhub-api');
  });

  it('GET /health works at the root too', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it('unknown routes return the NOT_FOUND envelope', async () => {
    const res = await fetch(`${base}/no-such-route`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.requestId, 'missing requestId in body');
  });
});
