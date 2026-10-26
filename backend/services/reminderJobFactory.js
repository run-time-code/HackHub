const ReminderJob = require("../models/ReminderJob");

const reminderDefinitions = [
    {
        eventType: "registration_deadline",
        dateField: "registrationDeadline",
        prefField: "registrationDeadlineHours",
        defaultOffsets: [24]
    },
    {
        eventType: "submission_deadline",
        dateField: "submissionDeadline",
        prefField: "submissionDeadlineHours",
        defaultOffsets: [24]
    },
    {
        eventType: "event_start",
        dateField: "eventStartDate",
        prefField: "eventStartHours",
        defaultOffsets: [24]
    },
    {
        eventType: "event_end",
        dateField: "eventEndDate",
        prefField: "eventEndHours",
        defaultOffsets: []
    }
];

const createReminderJobsForUser = async (user, hackathon) => {
    if (!user || !hackathon) {
        throw new TypeError("A user and hackathon are required to create reminders");
    }

    const preferences = user.reminderPreferences || {};
    const createdJobs = [];
    const expectedKeys = [];

    if (preferences.enabled === false) {
        await ReminderJob.updateMany(
            {
                user: user._id,
                hackathon: hackathon._id,
                status: "queued"
            },
            {
                $set: { status: "cancelled" }
            }
        );
        return createdJobs;
    }

    for (const definition of reminderDefinitions) {
        const targetDate = hackathon[definition.dateField];

        if (!targetDate) {
            continue;
        }

        const targetDateValue = new Date(targetDate);
        if (Number.isNaN(targetDateValue.getTime())) {
            continue;
        }

        const configuredOffsets = preferences[definition.prefField];
        const offsets = configuredOffsets === undefined
            ? definition.defaultOffsets
            : Array.isArray(configuredOffsets)
                ? configuredOffsets
                : [];

        for (const offsetHours of offsets) {
            const offsetNumber = Number(offsetHours);

            if (!Number.isFinite(offsetNumber) || offsetNumber < 0) {
                continue;
            }

            const runAt = new Date(
                targetDateValue.getTime() - offsetNumber * 60 * 60 * 1000
            );

            if (runAt <= new Date()) {
                continue;
            }

            const idempotencyKey = [
                String(user._id),
                String(hackathon._id),
                definition.eventType,
                String(targetDateValue.getTime()),
                String(offsetNumber)
            ].join(":");

            expectedKeys.push(idempotencyKey);

            let updateResult;
            try {
                updateResult = await ReminderJob.updateOne(
                    { idempotencyKey },
                    {
                        $set: { runAt },
                        $setOnInsert: {
                            user: user._id,
                            hackathon: hackathon._id,
                            eventType: definition.eventType,
                            idempotencyKey,
                            status: "queued"
                        }
                    },
                    {
                        upsert: true,
                        runValidators: true
                    }
                );
            } catch (error) {
                if (error.code !== 11000) {
                    throw error;
                }

                updateResult = { upsertedCount: 0 };
            }

            if (updateResult.upsertedCount > 0) {
                const reminder = await ReminderJob.findOne({ idempotencyKey });
                if (reminder) {
                    createdJobs.push(reminder);
                }
            } else {
                const reactivated = await ReminderJob.findOneAndUpdate(
                    {
                        idempotencyKey,
                        status: "cancelled"
                    },
                    {
                        $set: {
                            status: "queued",
                            runAt,
                            lastError: ""
                        }
                    },
                    {
                        returnDocument: "after"
                    }
                );

                if (reactivated) {
                    createdJobs.push(reactivated);
                }
            }
        }
    }

    await ReminderJob.updateMany(
        {
            user: user._id,
            hackathon: hackathon._id,
            status: "queued",
            ...(expectedKeys.length > 0
                ? { idempotencyKey: { $nin: expectedKeys } }
                : {})
        },
        {
            $set: { status: "cancelled" }
        }
    );

    return createdJobs;
};

module.exports = {
    createReminderJobsForUser
};