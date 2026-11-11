
'use strict';

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const config = require('../src/config');
const createApp = require('../src/app');

const ANONYMOUS_LIMIT = config.apiRateLimit.perIp;

describe('global API rate limiting', () => {
  let server;
  let base;

  before(async () => {
    const app = createApp();

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });

    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (!server) return;

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('returns HTTP 429 after exceeding the anonymous IP limit', async () => {
    let lastResponse;

    for (let i = 0; i < ANONYMOUS_LIMIT + 1; i += 1) {
      lastResponse = await fetch(`${base}/api/rate-limit-test`);
    }

    assert.equal(lastResponse.status, 429);

    const body = await lastResponse.json();
    assert.equal(
      body.message,
      'Too many requests. Please try again later.'
    );



assert.ok(
  lastResponse.headers.get('ratelimit') ||
    lastResponse.headers.get('ratelimit-limit') ||
    lastResponse.headers.get('x-ratelimit-limit'),
  'Expected rate-limit headers'
);

    // Root-mounted duplicates must be covered by the same limiter.
    const rootResponse = await fetch(`${base}/rate-limit-test`);
    assert.equal(rootResponse.status, 429);
  });

  it('buckets authenticated callers per account, not per IP', async () => {
    // The anonymous IP bucket above is already exhausted. A signed-in user on
    // the same IP must still be served from its own bucket.
    const token = jwt.sign(
      { id: '64b7f0c2f1a2b3c4d5e6f708' },
      config.jwtSecret,
      { expiresIn: '5m' }
    );

    const response = await fetch(`${base}/api/rate-limit-test`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.notEqual(response.status, 429);
  });

  it('does not rate-limit the health endpoint', async () => {
    const response = await fetch(`${base}/api/health`);


    assert.notEqual(response.status, 429);

    const rootHealth = await fetch(`${base}/health`);
    assert.notEqual(rootHealth.status, 429);
  });
});
