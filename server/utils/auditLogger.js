const AuditLog = require("../models/AuditLog");

const logAuditEvent = async ({
    event,
    userId = null,
    email = null,
    success,
    statusCode = null,
    ip = null,
    userAgent = null,
    details = null
}) => {
    try {
        await AuditLog.create({
            event,
            userId,
            email,
            success,
            statusCode,
            ip,
            userAgent,
            details
        });
    } catch (error) {
        // Audit logging failure must not crash the main API request.
        console.error(
            "Audit log could not be saved:",
            error.message
        );
    }
};

module.exports = logAuditEvent;