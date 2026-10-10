const sanitizeObject = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitizeObject);
    }

    if (value !== null && typeof value === "object") {
        const sanitized = {};

        for (const [key, item] of Object.entries(value)) {
            if (key.startsWith("$") || key.includes(".")) {
                continue;
            }

            sanitized[key] = sanitizeObject(item);
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