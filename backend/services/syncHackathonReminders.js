const User = require("../models/User");
const { createReminderJobsForUser } = require("./reminderJobFactory");

const syncHackathonReminders = async (hackathon) => {
    if (!hackathon) {
        throw new TypeError("A hackathon is required to sync reminders");
    }

    const createdJobs = [];
    const users = User.find()
        .select("_id reminderPreferences")
        .lean()
        .cursor();

    for await (const user of users) {
        const jobs = await createReminderJobsForUser(user, hackathon);
        createdJobs.push(...jobs);
    }

    return createdJobs;
};

module.exports = {
    syncHackathonReminders
};