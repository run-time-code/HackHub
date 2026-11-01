const User = require("../models/User");
const {
    suspendUserSideEffects,
    purgeUserRows
} = require("./accountErasure");

const RETENTION_DAYS = 30;

const cutoffDate = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    return cutoff;
};

const previewDeletedAccounts = async () => {
    const cutoff = cutoffDate();

    const users = await User.find({
        deletedAt: {
            $ne: null,
            $lte: cutoff
        }
    })
        .select("_id email deletedAt")
        .lean();

    return {
        retentionDays: RETENTION_DAYS,
        cutoffDate: cutoff,
        eligibleAccounts: users.length,
        accounts: users
    };
};

// Permanent erasure. Each account is processed independently so one bad row
// cannot block the whole nightly run, and the user document is removed last:
// if the job dies mid-way the account is retried on the next run (every step
// is idempotent) instead of orphaning rows with no owning account.
const purgeDeletedAccounts = async () => {
    const cutoff = cutoffDate();

    const deletedUsers = await User.find({
        deletedAt: {
            $ne: null,
            $lte: cutoff
        }
    })
        .select("_id")
        .lean();

    const result = {
        deletedAccounts: 0,
        deletedRegistrations: 0,
        deletedSavedHackathons: 0,
        deletedReminders: 0,
        deletedNotifications: 0,
        deletedJoinRequests: 0
    };

    for (const { _id } of deletedUsers) {
        await suspendUserSideEffects(_id);

        const rows = await purgeUserRows(_id);

        result.deletedRegistrations += rows.registrations;
        result.deletedSavedHackathons += rows.savedHackathons;
        result.deletedReminders += rows.reminders;
        result.deletedNotifications += rows.notifications;
        result.deletedJoinRequests += rows.joinRequests;

        const removed = await User.deleteOne({
            _id,
            deletedAt: {
                $ne: null,
                $lte: cutoff
            }
        });

        result.deletedAccounts += removed.deletedCount || 0;
    }

    return result;
};

module.exports = {
    purgeDeletedAccounts,
    previewDeletedAccounts
};
