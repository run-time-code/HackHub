'use strict';

// Keys that can change an object's prototype or the behaviour of property
// lookups. They are never legitimate request data and must be dropped before
// any downstream code sees the object. See SECURITY_AUDIT_REPORT.md SAN-01.
const FORBIDDEN_KEYS = new Set([
    "__proto__",
    "constructor",
    "prototype"
]);

const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

const isSanitizableObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Recursively copy user-controlled data into null-prototype objects.
 *
 * A null prototype means a request body such as
 * `{"__proto__":{"role":"admin"}}` cannot make `req.body.role` resolve
 * through the prototype chain. Forbidden keys and Mongo operators/dotted
 * paths are dropped at every level.
 *
 * @param {*} value Raw user input.
 * @param {boolean} allowDottedKeys Kept for the validated skillProficiency map
 *   (skill names such as "Node.js" are data, never query keys).
 * @returns {*}
 */
const sanitizeObject = (value, allowDottedKeys = false) => {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeObject(item, allowDottedKeys));
    }

    if (!isSanitizableObject(value)) {
        return value;
    }

    // Build with no prototype so inherited properties are never present.
    const sanitized = Object.create(null);

    for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(key)) {
            continue;
        }

        // `$` operators are never legitimate request data. Dots are
        // stripped to block path injection, except for skill names such
        // as "Node.js" inside the validated skillProficiency map (Mixed
        // field, never used in a Mongo query).
        if (key.startsWith("$") || (!allowDottedKeys && key.includes("."))) {
            continue;
        }

        // Only copy own enumerable properties. Object.keys already does
        // that, but the explicit hasOwn check documents the contract and
        // protects against a future refactor to for...in.
        if (!hasOwn(value, key)) {
            continue;
        }

        sanitized[key] = sanitizeObject(
            value[key],
            allowDottedKeys || key === "skillProficiency"
        );
    }

    return sanitized;
};

const sanitizeValue = (value) => {
    // Sanitize the request body, query and params so user-supplied keys
    // like $where / $gt or dotted keys cannot inject operators or paths.
    return sanitizeObject(value);
};

// Express 5 exposes req.query as a prototype getter with no setter. A plain
// `req.query = ...` therefore silently does nothing (and each access rebuilds
// the original object). Defining an own property shadows the getter so the
// sanitized value is what every later middleware and controller sees.
const replaceRequestProperty = (req, property, value) => {
    Object.defineProperty(req, property, {
        value,
        writable: true,
        configurable: true,
        enumerable: true
    });
};

const sanitizeMiddleware = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }

    // Query and path parameters are user input too — sanitize them so a
    // request such as /users?role[$ne]=admin cannot inject operators.
    if (req.query && typeof req.query === "object") {
        replaceRequestProperty(req, "query", sanitizeValue(req.query));
    }

    // NOTE: app-level middleware runs before Express populates route params,
    // so this branch only covers routers that mount the sanitizer after their
    // params exist. Route handlers still validate ids and enum values; see
    // docs/AUDIT_REPORT.md for the documented limitation.
    if (req.params && typeof req.params === "object") {
        replaceRequestProperty(req, "params", sanitizeValue(req.params));
    }

    next();
};

module.exports = sanitizeMiddleware;
// Exposed for unit tests that need to assert on the sanitizer's internal
// object shape (null prototype, dropped keys) rather than HTTP JSON output.
module.exports.sanitizeObject = sanitizeObject;
