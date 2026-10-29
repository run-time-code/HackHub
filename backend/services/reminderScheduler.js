const ReminderJob = require("../models/ReminderJob");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendReminderEmail } = require("./emailService");

const CHECK_INTERVAL_MS = 30_000;
const LOCK_TIMEOUT_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_JOBS_PER_TICK = 50;

let timer = null;
let isProcessing = false;

const eventLabels = {
    registration_deadline: "registration deadline",
    submission_deadline: "submission deadline",
    event_start: "event start",
    event_end: "event end"
};

const claimNextJob = async () => {
    const now = new Date();
    const staleLockTime = new Date(now.getTime() - LOCK_TIMEOUT_MS);

    return ReminderJob.findOneAndUpdate(
        {
            $or: [
                {
                    status: "queued",
                    runAt: { $lte: now }
                },
                {
                    status: "processing",
                    lockedAt: { $lte: staleLockTime }
                }
            ]
        },
        {
            $set: {
                status: "processing",
                lockedAt: now
            },
            $inc: {
                attempts: 1
            }
        },
        {
            sort: { runAt: 1 },
            returnDocument: "after"
        }
    );
};

const createNotification = async (job) => {
    await job.populate("hackathon", "title");

    if (!job.hackathon) {
        throw new Error("The hackathon for this reminder no longer exists");
    }

    const label = eventLabels[job.eventType];
    const title = `Hackathon ${label} reminder`;
    const message = `${job.hackathon.title}: reminder for the ${label}.`;

    // Upserting by reminderJob makes notification creation idempotent.
    const notification = await Notification.findOneAndUpdate(
        { reminderJob: job._id },
        {
            $setOnInsert: {
                user: job.user,
                hackathon: job.hackathon._id,
                reminderJob: job._id,
                type: job.eventType,
                title,
                message
            }
        },
        {
            upsert: true,
            returnDocument: "after",
            runValidators: true
        }
    );

    const user = await User.findById(job.user)
        .select("email emailVerified reminderPreferences");

    if (!user) {
        throw new Error("The user for this reminder no longer exists");
    }

    if (
        user.emailVerified &&
        user.reminderPreferences?.emailReminders !== false &&
        !notification.emailSentAt
    ) {
        await sendReminderEmail({
            to: user.email,
            title,
            message
        });

        await Notification.updateOne(
            { _id: notification._id, emailSentAt: null },
            { $set: { emailSentAt: new Date() } }
        );
    }
};

const processJob = async (job) => {
    try {
        await createNotification(job);

        await ReminderJob.updateOne(
            {
                _id: job._id,
                status: "processing",
                lockedAt: job.lockedAt
            },
            {
                $set: {
                    status: "sent",
                    sentAt: new Date(),
                    lockedAt: null,
                    lastError: ""
                }
            }
        );
    } catch (error) {
        const isDead = job.attempts >= MAX_ATTEMPTS;
        const retryDelayMs = Math.min(
            60_000 * (2 ** Math.max(job.attempts - 1, 0)),
            60 * 60_000
        );

        try {
            await ReminderJob.updateOne(
                {
                    _id: job._id,
                    status: "processing",
                    lockedAt: job.lockedAt
                },
                {
                    $set: {
                        status: isDead ? "dead" : "queued",
                        runAt: isDead
                            ? job.runAt
                            : new Date(Date.now() + retryDelayMs),
                        lockedAt: null,
                        lastError: error.message
                    }
                }
            );
        } catch (updateError) {
            console.error(
                "Could not update failed reminder job:",
                updateError.message
            );
        }

        console.error("Reminder job failed:", error.message);
    }
};

const processDueJobs = async () => {
    if (isProcessing) {
        return;
    }

    isProcessing = true;

    try {
        for (let count = 0; count < MAX_JOBS_PER_TICK; count++) {
            const job = await claimNextJob();

            if (!job) {
                break;
            }

            await processJob(job);
        }
    } catch (error) {
        console.error("Reminder scheduler failed:", error.message);
    } finally {
        isProcessing = false;
    }
};

const scheduleReminderJobs = () => {
    if (timer) {
        return timer;
    }

    void processDueJobs();
    timer = setInterval(processDueJobs, CHECK_INTERVAL_MS);

    return timer;
};

module.exports = {
    scheduleReminderJobs
};