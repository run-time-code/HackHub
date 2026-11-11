'use strict';

// Regression test: pino-http must never write session cookies, Authorization
// bearers, CSRF tokens or emailed verification tokens to the log stream.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const express = require('express');
const pino = require('pino');

const { createHttpLogger } = require('../src/middleware/httpLogger');

describe('HTTP log redaction', () => {
  let server;
  let base;
  let output = '';

  before(async () => {
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });

    const testLogger = pino({ level: 'info' }, sink);
    const app = express();

    app.use(createHttpLogger(testLogger));
    app.get('/probe', (req, res) => {
      res.cookie('session', 'COOKIE_SECRET_VALUE', { httpOnly: true });
      res.status(200).json({ ok: true });
    });

    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}`;

    await fetch(`${base}/probe?token=VERIFY_TOKEN_VALUE&state=OAUTH_STATE_VALUE`, {
      headers: {
        cookie: 'accessToken=COOKIE_SECRET_VALUE',
        authorization: 'Bearer BEARER_SECRET_VALUE',
        'x-csrf-token': 'CSRF_SECRET_VALUE',
      },
    });

    // The log line is emitted on response finish; give the sink a tick.
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('emits the request log line', () => {
    assert.match(output, /"url":"\/probe"/);
  });

  it('redacts cookies, bearer tokens, CSRF tokens and email/oauth query values', () => {
    assert.doesNotMatch(output, /COOKIE_SECRET_VALUE/);
    assert.doesNotMatch(output, /BEARER_SECRET_VALUE/);
    assert.doesNotMatch(output, /CSRF_SECRET_VALUE/);
    assert.doesNotMatch(output, /VERIFY_TOKEN_VALUE/);
    assert.doesNotMatch(output, /OAUTH_STATE_VALUE/);
    assert.match(output, /\[REDACTED\]/);
  });
});
