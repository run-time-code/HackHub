const Hackathon = require("../models/Hackathon");
const { createReminderJobsForUser } = require("./reminderJobFactory");

const syncUserReminderJobs = async (user) => {
    if (!user || !user._id) {
        throw new TypeError("A saved user is required to sync reminder jobs");
    }

    const hackathons = Hackathon.find({
        isCanonical: true,
        isActive: true
    })
        .select("_id registrationDeadline submissionDeadline eventStartDate eventEndDate")
        .lean()
        .cursor();

    let createdCount = 0;
    for await (const hackathon of hackathons) {
        const createdJobs = await createReminderJobsForUser(user, hackathon);
        createdCount += createdJobs.length;
    }

    return createdCount;
};

module.exports = {
    syncUserReminderJobs
};
