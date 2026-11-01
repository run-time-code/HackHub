const sanitizeObject = (value, allowDottedKeys = false) => {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeObject(item, allowDottedKeys));
    }

    if (value !== null && typeof value === "object") {
        const sanitized = {};

        for (const [key, item] of Object.entries(value)) {
            // `$` operators are never legitimate request data. Dots are
            // stripped to block path injection, except for skill names such
            // as "Node.js" inside the validated skillProficiency map (Mixed
            // field, never used in a Mongo query).
            if (key.startsWith("$") || (!allowDottedKeys && key.includes("."))) {
                continue;
            }

            sanitized[key] = sanitizeObject(
                item,
                allowDottedKeys || key === "skillProficiency"
            );
        }

        return sanitized;
    }

    return value;
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
