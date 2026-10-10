const mongoose = require("mongoose");
const crypto = require("crypto");

const Hackathon = require("../models/Hackathon");
const { redisClient } = require("../config/redis");

const CACHE_TTL = 60;

// GET /api/hackathons
const getHackathons = async (req, res) => {
    try {
        /*
         * -----------------------------
         * 1. CREATE CACHE KEY
         * -----------------------------
         */

        const queryString = JSON.stringify(req.query);

        const hash = crypto
            .createHash("sha256")
            .update(queryString)
            .digest("hex");

        const cacheKey = `hackathons:${hash}`;

        /*
         * -----------------------------
         * 2. CHECK REDIS CACHE
         * -----------------------------
         */

        if (redisClient.isOpen) {
            const cachedData =
                await redisClient.get(cacheKey);

            if (cachedData) {
                const cachedResponse =
                    JSON.parse(cachedData);

                const etag = `"${hash}"`;

                res.set("ETag", etag);

                res.set(
                    "Cache-Control",
                    "public, max-age=60"
                );

                if (req.headers["if-none-match"] === etag) {
                    return res.status(304).end();
                }

                res.set("X-Cache", "HIT");

                return res.status(200).json(
                    cachedResponse
                );
            }
        }

        /*
         * -----------------------------
         * 3. BUILD MONGODB FILTER
         * -----------------------------
         */

        const limit = Math.min(
            parseInt(req.query.limit) || 10,
            50
        );

        const filter = {};

        if (req.query.search) {
            filter.$text = {
                $search: req.query.search
            };
        }

        if (req.query.skills) {
            filter.skills = {
                $in: req.query.skills.split(",")
            };
        }

        if (req.query.domain) {
            filter.domain = {
                $in: req.query.domain.split(",")
            };
        }

        if (req.query.mode) {
            filter.mode =
                req.query.mode.toUpperCase();
        }

        if (req.query.location) {
            filter.location = {
                $regex: req.query.location,
                $options: "i"
            };
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.source) {
            if (
                mongoose.isValidObjectId(
                    req.query.source
                )
            ) {
                filter.source = req.query.source;
            }
        }

        if (
            req.query.minPrize ||
            req.query.maxPrize
        ) {
            filter.prize = {};

            if (req.query.minPrize) {
                filter.prize.$gte =
                    Number(req.query.minPrize);
            }

            if (req.query.maxPrize) {
                filter.prize.$lte =
                    Number(req.query.maxPrize);
            }
        }

        if (
            req.query.fromDate ||
            req.query.toDate
        ) {
            filter.registrationDeadline = {};

            if (req.query.fromDate) {
                filter.registrationDeadline.$gte =
                    new Date(req.query.fromDate);
            }

            if (req.query.toDate) {
                filter.registrationDeadline.$lte =
                    new Date(req.query.toDate);
            }
        }

        /*
         * -----------------------------
         * 4. CURSOR PAGINATION
         * -----------------------------
         */

        if (req.query.cursor) {
            if (
                mongoose.isValidObjectId(
                    req.query.cursor
                )
            ) {
                filter._id = {
                    $gt: req.query.cursor
                };
            }
        }

        /*
         * -----------------------------
         * 5. SORTING
         * -----------------------------
         */

        let sort = {
            _id: 1
        };

        if (req.query.sort === "deadline") {
            sort = {
                registrationDeadline: 1,
                _id: 1
            };
        }

        if (req.query.sort === "prize_high") {
            sort = {
                prize: -1,
                _id: 1
            };
        }

        if (req.query.sort === "prize_low") {
            sort = {
                prize: 1,
                _id: 1
            };
        }

        if (req.query.sort === "newest") {
            sort = {
                createdAt: -1,
                _id: -1
            };
        }

        /*
         * -----------------------------
         * 6. FETCH HACKATHONS
         * -----------------------------
         */

        const hackathons =
            await Hackathon.find(filter)
                .populate("organizer")
                .populate("source")
                .populate("tags")
                .sort(sort)
                .limit(limit + 1);

        const hasMore =
            hackathons.length > limit;

        if (hasMore) {
            hackathons.pop();
        }

        let nextCursor = null;

        if (
            hasMore &&
            hackathons.length > 0
        ) {
            nextCursor =
                hackathons[
                    hackathons.length - 1
                ]._id;
        }

        /*
         * -----------------------------
         * 7. FACETS
         * -----------------------------
         */

        const facets =
            await Hackathon.aggregate([
                {
                    $match: filter
                },
                {
                    $facet: {
                        modes: [
                            {
                                $group: {
                                    _id: "$mode",
                                    count: {
                                        $sum: 1
                                    }
                                }
                            }
                        ],

                        statuses: [
                            {
                                $group: {
                                    _id: "$status",
                                    count: {
                                        $sum: 1
                                    }
                                }
                            }
                        ],

                        locations: [
                            {
                                $group: {
                                    _id: "$location",
                                    count: {
                                        $sum: 1
                                    }
                                }
                            }
                        ],

                        sources: [
                            {
                                $group: {
                                    _id: "$source",
                                    count: {
                                        $sum: 1
                                    }
                                }
                            }
                        ]
                    }
                }
            ]);

        /*
         * -----------------------------
         * 8. RESPONSE
         * -----------------------------
         */

        const response = {
            success: true,

            data: hackathons,

            pagination: {
                limit,
                hasMore,
                nextCursor
            },

            facets: facets[0]
        };

        /*
         * -----------------------------
         * 9. SAVE RESPONSE IN REDIS
         * -----------------------------
         */

        if (redisClient.isOpen) {
            await redisClient.setEx(
                cacheKey,
                CACHE_TTL,
                JSON.stringify(response)
            );
        }

        /*
         * -----------------------------
         * 10. ETAG + CACHE HEADERS
         * -----------------------------
         */

        const etag = `"${hash}"`;

        res.set("ETag", etag);

        res.set(
            "Cache-Control",
            "public, max-age=60"
        );

        res.set("X-Cache", "MISS");

        if (req.headers["if-none-match"] === etag) {
            return res.status(304).end();
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error(
            "Get hackathons error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: {
                message:
                    "Failed to fetch hackathons"
            }
        });
    }
};


/*
 * GET /api/hackathons/:idOrSlug
 */
const getHackathonByIdOrSlug = async (
    req,
    res
) => {
    try {
        const {
            idOrSlug
        } = req.params;

        const cacheKey =
            `hackathon:${idOrSlug}`;

        /*
         * Check Redis
         */

        if (redisClient.isOpen) {
            const cachedData =
                await redisClient.get(cacheKey);

            if (cachedData) {
                res.set(
                    "Cache-Control",
                    "public, max-age=60"
                );

                res.set(
                    "X-Cache",
                    "HIT"
                );

                return res.status(200).json(
                    JSON.parse(cachedData)
                );
            }
        }

        /*
         * Fetch from MongoDB
         */

        let hackathon;

        if (
            mongoose.isValidObjectId(
                idOrSlug
            )
        ) {
            hackathon =
                await Hackathon.findById(
                    idOrSlug
                )
                    .populate("organizer")
                    .populate("source")
                    .populate("tags");
        } else {
            hackathon =
                await Hackathon.findOne({
                    slug: idOrSlug
                })
                    .populate("organizer")
                    .populate("source")
                    .populate("tags");
        }

        if (!hackathon) {
            return res.status(404).json({
                success: false,
                error: {
                    message:
                        "Hackathon not found"
                }
            });
        }

        const response = {
            success: true,
            data: hackathon
        };

        /*
         * Save to Redis
         */

        if (redisClient.isOpen) {
            await redisClient.setEx(
                cacheKey,
                CACHE_TTL,
                JSON.stringify(response)
            );
        }

        res.set(
            "Cache-Control",
            "public, max-age=60"
        );

        res.set(
            "X-Cache",
            "MISS"
        );

        return res.status(200).json(response);

    } catch (error) {
        console.error(
            "Get hackathon error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: {
                message:
                    "Failed to fetch hackathon"
            }
        });
    }
};


module.exports = {
    getHackathons,
    getHackathonByIdOrSlug
};