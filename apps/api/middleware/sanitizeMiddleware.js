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

const sanitizeMiddleware = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }

    // Query and path parameters are user input too — sanitize them so a
    // request such as /users?role[$ne]=admin cannot inject operators.
    if (req.query && typeof req.query === "object") {
        req.query = sanitizeValue(req.query);
    }

    if (req.params && typeof req.params === "object") {
        req.params = sanitizeValue(req.params);
    }

    next();
};

module.exports = sanitizeMiddleware;