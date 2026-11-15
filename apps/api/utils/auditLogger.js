const AuditLog = require("../models/AuditLog");
const logger = require("../src/utils/logger");

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
        logger.error(
            { errorType: error?.name || "Error" },
            "Audit log could not be saved"
        );
    }
};

module.exports = logAuditEvent;