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

const sanitizeMiddleware = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }

    next();
};

module.exports = sanitizeMiddleware;