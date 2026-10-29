
'use strict';

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const createApp = require('../src/app');

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

  it('returns HTTP 429 after exceeding the API request limit', async () => {
    let lastResponse;

    for (let i = 0; i < 301; i += 1) {
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
  });

  it('does not rate-limit the health endpoint', async () => {
    const response = await fetch(`${base}/api/health`);


    assert.notEqual(response.status, 429);
  });
});
