const { redisClient } = require("../config/redis");


// ======================================================
// INVALIDATE HACKATHON CACHE
// ======================================================

const invalidateHackathonCache = async () => {

    if (!redisClient.isOpen) {

        console.log(
            "Redis is not connected. Cache invalidation skipped."
        );

        return;
    }


    // --------------------------------------------------
    // DELETE LIST CACHE
    // --------------------------------------------------

    const listKeys =
        await redisClient.keys(
            "hackathons:*"
        );


    if (listKeys.length > 0) {

        await redisClient.del(
            listKeys
        );

        console.log(
            `Deleted ${listKeys.length} hackathon list cache(s)`
        );
    }


    // --------------------------------------------------
    // DELETE SINGLE HACKATHON CACHE
    // --------------------------------------------------

    const singleKeys =
        await redisClient.keys(
            "hackathon:*"
        );


    if (singleKeys.length > 0) {

        await redisClient.del(
            singleKeys
        );

        console.log(
            `Deleted ${singleKeys.length} hackathon detail cache(s)`
        );
    }


    console.log(
        "Hackathon Redis cache invalidated"
    );
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
    invalidateHackathonCache
};