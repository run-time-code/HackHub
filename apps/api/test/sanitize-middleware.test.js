'use strict';

// Regression tests for the global request sanitizer. Express 5 defines
// req.query as a prototype getter, so the previous assignment-based
// implementation silently kept the raw query object.
//
// SAN-01: the sanitizer must also reject prototype-related keys and build
// null-prototype objects so inherited properties can never be reached through
// req.body / req.query / req.params.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const sanitizeMiddleware = require('../middleware/sanitizeMiddleware');
const { sanitizeObject } = sanitizeMiddleware;

describe('sanitizeObject (SAN-01)', () => {
  it('returns null-prototype objects at every nesting level', () => {
    const result = sanitizeObject({
      safe: { nested: { keep: true } },
      list: [{ keep: true }],
    });

    assert.equal(Object.getPrototypeOf(result), null);
    assert.equal(Object.getPrototypeOf(result.safe), null);
    assert.equal(Object.getPrototypeOf(result.safe.nested), null);
    assert.equal(Object.getPrototypeOf(result.list[0]), null);
    assert.equal(result.safe.nested.keep, true);
    assert.equal(result.list[0].keep, true);
  });

  it('drops __proto__, constructor and prototype keys at every level', () => {
    const payload = JSON.parse(
      '{"safe":true,' +
        '"__proto__":{"role":"admin"},' +
        '"constructor":{"prototype":{"isAdmin":true}},' +
        '"prototype":{"role":"admin"},' +
        '"nested":{"__proto__":{"polluted":true},"ok":1},' +
        '"list":[{"__proto__":{"polluted":true},"ok":2}]}'
    );

    const result = sanitizeObject(payload);

    assert.equal(Object.hasOwn(result, '__proto__'), false);
    assert.equal(Object.hasOwn(result, 'constructor'), false);
    assert.equal(Object.hasOwn(result, 'prototype'), false);
    assert.equal(result.role, undefined);
    assert.equal(result.isAdmin, undefined);
    assert.equal(result.polluted, undefined);

    assert.equal(Object.hasOwn(result.nested, '__proto__'), false);
    assert.equal(result.nested.polluted, undefined);
    assert.equal(result.nested.ok, 1);

    assert.equal(Object.hasOwn(result.list[0], '__proto__'), false);
    assert.equal(result.list[0].polluted, undefined);
    assert.equal(result.list[0].ok, 2);
  });

  it('does not treat inherited properties as request data', () => {
    Object.prototype.inheritedRole = 'admin';
    try {
      const result = sanitizeObject({ name: 'Audit Alice' });

      assert.equal(result.name, 'Audit Alice');
      assert.equal(result.inheritedRole, undefined);
      assert.equal(Object.hasOwn(result, 'inheritedRole'), false);
    } finally {
      delete Object.prototype.inheritedRole;
    }
  });

  it('leaves Object.prototype unchanged after a prototype payload', () => {
    sanitizeObject(JSON.parse('{"__proto__":{"isAdmin":true}}'));

    assert.equal(Object.prototype.isAdmin, undefined);
    assert.equal({}.isAdmin, undefined);
  });

  it('keeps the skillProficiency dotted-key exception while still dropping prototype keys', () => {
    const result = sanitizeObject({
      skillProficiency: {
        'Node.js': 4,
        '__proto__': { role: 'admin' },
        constructor: 'nope',
      },
      other: { 'dotted.key': 'removed' },
    });

    assert.equal(result.skillProficiency['Node.js'], 4);
    assert.equal(Object.hasOwn(result.skillProficiency, '__proto__'), false);
    assert.equal(Object.hasOwn(result.skillProficiency, 'constructor'), false);
    assert.equal(Object.hasOwn(result.other, 'dotted.key'), false);
  });
});

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

  it('never exposes prototype keys or inherited properties to a controller', async () => {
    const response = await fetch(`${base}/probe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        __proto__: { role: 'admin' },
        constructor: { prototype: { isAdmin: true } },
        nested: { __proto__: { polluted: true }, keep: true },
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.body, { nested: { keep: true } });
    assert.equal(body.body.role, undefined);
    assert.equal(body.body.isAdmin, undefined);
    assert.equal(body.body.polluted, undefined);
    assert.equal(Object.prototype.role, undefined);
    assert.equal(Object.prototype.isAdmin, undefined);
  });

  it('drops prototype-shaped query keys', async () => {
    const response = await fetch(
      `${base}/probe?__proto__[role]=admin&constructor[prototype][isAdmin]=true&safe=kept`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.query, { safe: 'kept' });
  });
});
