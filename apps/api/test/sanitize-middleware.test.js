'use strict';

// Regression tests for the global request sanitizer. Express 5 defines
// req.query as a prototype getter, so the previous assignment-based
// implementation silently kept the raw query object.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const sanitizeMiddleware = require('../middleware/sanitizeMiddleware');

describe('request sanitization', () => {
  let server;
  let base;

  before(async () => {
    const app = express();
    // Force the extended parser so operator-shaped query strings become
    // nested objects; this is the attack shape the sanitizer must remove.
    app.set('query parser', 'extended');
    app.use(express.json());
    app.use(sanitizeMiddleware);
    app.all('/probe', (req, res) => {
      res.json({ query: req.query, body: req.body });
    });

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (!server) return;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('strips Mongo operators and dotted keys from the query string', async () => {
    const response = await fetch(
      `${base}/probe?role[$ne]=admin&profile.name=root&safe=kept&nested[a][$gt]=1`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.query, {
      role: {},
      safe: 'kept',
      nested: { a: {} },
    });
  });

  it('strips Mongo operators and dotted keys from JSON bodies', async () => {
    const response = await fetch(`${base}/probe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: { $ne: null },
        'profile.name': 'root',
        safe: { nested: { $where: 'sleep(1000)' }, keep: true },
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.body, {
      email: {},
      safe: { nested: {}, keep: true },
    });
  });
});
