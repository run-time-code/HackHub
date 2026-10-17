const User = require("../models/User");
const { syncUserReminderJobs } = require("../services/syncUserReminderJobs");

const reminderFields = [
    "enabled",
    "emailReminders",
    "registrationDeadlineHours",
    "submissionDeadlineHours",
    "eventStartHours",
    "eventEndHours"
];

const validateReminderPreferenceUpdate = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "Request body must be an object";
    }

    const allowedFields = new Set([...reminderFields, "timeZone"]);
    const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));
    if (unknownField) {
        return `Unsupported preference: ${unknownField}`;
    }

    if (Object.keys(body).length === 0) {
        return "At least one preference is required";
    }

    for (const field of ["enabled", "emailReminders"]) {
        if (body[field] !== undefined && typeof body[field] !== "boolean") {
            return `${field} must be a boolean`;
        }
    }

    for (const field of reminderFields.slice(2)) {
        if (body[field] === undefined) {
            continue;
        }
        if (
            !Array.isArray(body[field]) ||
            body[field].length > 5 ||
            body[field].some(
                (hours) =>
                    typeof hours !== "number" ||
                    !Number.isFinite(hours) ||
                    hours < 0 ||
                    hours > 8760
            )
        ) {
            return `${field} must be an array of up to 5 numbers between 0 and 8760`;
        }
    }

    if (body.timeZone !== undefined) {
        if (typeof body.timeZone !== "string" || body.timeZone.trim().length === 0) {
            return "timeZone must be a valid IANA time zone";
        }
        try {
            new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone.trim() });
        } catch {
            return "timeZone must be a valid IANA time zone";
        }
    }

    return null;
};

const getReminderPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "_id timeZone reminderPreferences"
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: "User account no longer exists" }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                timeZone: user.timeZone,
                reminderPreferences: user.reminderPreferences
            }
        });
    } catch (error) {
        console.error("Fetching reminder preferences failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not fetch reminder preferences" }
        });
    }
};

const updateReminderPreferences = async (req, res) => {
    const validationError = validateReminderPreferenceUpdate(req.body);
    if (validationError) {
        return res.status(400).json({
            success: false,
            error: { message: validationError }
        });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: "User account no longer exists" }
            });
        }

        if (req.body.timeZone !== undefined) {
            user.timeZone = req.body.timeZone.trim();
        }

        for (const field of reminderFields) {
            if (req.body[field] !== undefined) {
                user.set(`reminderPreferences.${field}`, req.body[field]);
            }
        }

        try {
            await user.save();
        } catch (error) {
            if (error.name === "ValidationError") {
                return res.status(400).json({
                    success: false,
                    error: { message: error.message }
                });
            }
            throw error;
        }

        const queuedJobsCreated = await syncUserReminderJobs(user);

        return res.status(200).json({
            success: true,
            data: {
                timeZone: user.timeZone,
                reminderPreferences: user.reminderPreferences,
                queuedJobsCreated
            }
        });
    } catch (error) {
        console.error("Updating reminder preferences failed:", error.message);
        return res.status(500).json({
            success: false,
            error: {
                message: "Preferences were not fully applied. Retry the update to resync pending reminders."
            }
        });
    }
};

module.exports = {
    getReminderPreferences,
    updateReminderPreferences,
    validateReminderPreferenceUpdate
};
