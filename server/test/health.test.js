'use strict';

// Smoke tests for the API skeleton.
// No database needed. Run with: npm test

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
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

  it('auth routes expose CSRF bootstrap and reject mutations without a token', async () => {
    const bootstrap = await fetch(`${base}/api/auth/csrf-token`);
    assert.equal(bootstrap.status, 200);
    const { csrfToken } = await bootstrap.json();
    const csrfCookie = bootstrap.headers.get('set-cookie').split(';', 1)[0];
    assert.ok(csrfToken);
    assert.match(bootstrap.headers.get('set-cookie'), /psifi\.x-csrf-token/);

    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    assert.equal(login.status, 403);

    const logout = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: csrfCookie,
      },
      body: JSON.stringify({}),
    });
    assert.equal(logout.status, 200);
  });

  it('mounted profile and optional OAuth routes respond without a database or provider credentials', async () => {
    const profile = await fetch(`${base}/api/users/me`);
    assert.equal(profile.status, 401);

    const oauth = await fetch(`${base}/api/auth/google`);
    assert.equal(oauth.status, 503);
  });

  it('credentialed CORS allows the configured frontend origin', async () => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-csrf-token',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });

  it('unknown routes return the NOT_FOUND envelope', async () => {
    const res = await fetch(`${base}/no-such-route`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.requestId, 'missing requestId in body');
  });

  it('metrics are hidden unless the scrape token is supplied', async () => {
    const previousToken = config.metricsToken;
    config.metricsToken = 'test-metrics-token';

    try {
      const hidden = await fetch(`${base}/metrics`);
      assert.equal(hidden.status, 404);

      const response = await fetch(`${base}/metrics`, {
        headers: { authorization: 'Bearer test-metrics-token' },
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/plain/);
      assert.match(await response.text(), /hackhub_http_requests_total/);
    } finally {
      config.metricsToken = previousToken;
    }
  });
});
