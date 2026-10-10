const mongoose = require("mongoose");
const User = require("../models/User");
const Registration = require("../models/Registration");

const RETENTION_DAYS = 30;

const previewDeletedAccounts = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const users = await User.find({
        deletedAt: {
            $ne: null,
            $lte: cutoffDate
        }
    })
        .select("_id email deletedAt")
        .lean();

    return {
        retentionDays: RETENTION_DAYS,
        cutoffDate,
        eligibleAccounts: users.length,
        accounts: users
    };
};

const purgeDeletedAccounts = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const session = await mongoose.startSession();

    try {
        let result = {
            deletedAccounts: 0,
            deletedRegistrations: 0
        };

        await session.withTransaction(async () => {
            const deletedUsers = await User.find({
                deletedAt: {
                    $ne: null,
                    $lte: cutoffDate
                }
            })
                .select("_id")
                .session(session)
                .lean();

            if (deletedUsers.length === 0) {
                return;
            }

            const userIds = deletedUsers.map(user => user._id);

            const registrationResult = await Registration.deleteMany({
                user: { $in: userIds }
            }).session(session);

            const userResult = await User.deleteMany({
                _id: { $in: userIds },
                deletedAt: {
                    $ne: null,
                    $lte: cutoffDate
                }
            }).session(session);

            result = {
                deletedAccounts: userResult.deletedCount,
                deletedRegistrations: registrationResult.deletedCount
            };
        });

        return result;
    } finally {
        await session.endSession();
    }
};

module.exports = {
    purgeDeletedAccounts,
    previewDeletedAccounts
};