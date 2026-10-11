const mongoose = require("mongoose");
const crypto = require("crypto");

const Hackathon = require("../models/Hackathon");
const { redisClient } = require("../config/redis");
const {
    SORTS,
    encodeCursor,
    decodeCursor,
    cursorFilter
} = require("../utils/hackathonPagination");

const CACHE_TTL = 60;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchesEtag = (header, etag) =>
    header === "*" ||
    (header || "").split(",").some((value) => value.trim() === etag);

// GET /api/hackathons
const getHackathons = async (req, res) => {
    try {
        const stringParameters = [
            "search",
            "skills",
            "domain",
            "mode",
            "location",
            "status",
            "source",
            "minPrize",
            "maxPrize",
            "fromDate",
            "toDate",
            "sort",
            "cursor",
            "limit"
        ];
        const invalidParameter = stringParameters.find(
            (name) => req.query[name] !== undefined && typeof req.query[name] !== "string"
        );
        if (invalidParameter) {
            return res.status(400).json({
                success: false,
                error: { message: `${invalidParameter} must be a single string value` }
            });
        }

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

                const etag = `"${crypto
                    .createHash("sha256")
                    .update(JSON.stringify(cachedResponse))
                    .digest("hex")}"`;

                res.set("ETag", etag);

                res.set(
                    "Cache-Control",
                    "public, max-age=60"
                );

                if (matchesEtag(req.headers["if-none-match"], etag)) {
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

        const requestedLimit = req.query.limit === undefined
            ? 10
            : Number(req.query.limit);
        if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
            return res.status(400).json({
                success: false,
                error: { message: "limit must be an integer between 1 and 50" }
            });
        }
        const limit = Math.min(requestedLimit, 50);

        const filter = { isCanonical: true };
        if (req.query.status !== "inactive") {
            filter.isActive = true;
        }
        const sortName = req.query.sort || "default";
        if (!Object.prototype.hasOwnProperty.call(SORTS, sortName)) {
            return res.status(400).json({
                success: false,
                error: { message: "sort must be deadline, prize_high, prize_low, or newest" }
            });
        }

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
            const mode = req.query.mode.toUpperCase();
            if (!["ONLINE", "OFFLINE", "HYBRID"].includes(mode)) {
                return res.status(400).json({
                    success: false,
                    error: { message: "mode must be ONLINE, OFFLINE, or HYBRID" }
                });
            }
            filter.mode = mode;
        }

        if (req.query.location) {
            filter.location = {
                $regex: escapeRegex(req.query.location),
                $options: "i"
            };
        }

        if (req.query.status) {
            if (!["upcoming", "ongoing", "completed", "inactive"].includes(req.query.status)) {
                return res.status(400).json({
                    success: false,
                    error: { message: "status is not supported" }
                });
            }
            filter.status = req.query.status;
        }

        if (req.query.source) {
            if (
                mongoose.isValidObjectId(
                    req.query.source
                )
            ) {
                filter.$and = [
                    ...(filter.$and || []),
                    {
                        $or: [
                            { source: new mongoose.Types.ObjectId(req.query.source) },
                            { "sourceListings.source": new mongoose.Types.ObjectId(req.query.source) }
                        ]
                    }
                ];
            } else {
                return res.status(400).json({
                    success: false,
                    error: { message: "source must be a valid source id" }
                });
            }
        }

        if (
            req.query.minPrize ||
            req.query.maxPrize
        ) {
            filter.prize = {};

            if (req.query.minPrize) {
                const minPrize = Number(req.query.minPrize);
                if (!Number.isFinite(minPrize) || minPrize < 0) {
                    return res.status(400).json({
                        success: false,
                        error: { message: "minPrize must be a non-negative number" }
                    });
                }
                filter.prize.$gte = minPrize;
            }

            if (req.query.maxPrize) {
                const maxPrize = Number(req.query.maxPrize);
                if (!Number.isFinite(maxPrize) || maxPrize < 0) {
                    return res.status(400).json({
                        success: false,
                        error: { message: "maxPrize must be a non-negative number" }
                    });
                }
                filter.prize.$lte = maxPrize;
            }
            if (
                filter.prize.$gte !== undefined &&
                filter.prize.$lte !== undefined &&
                filter.prize.$gte > filter.prize.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    error: { message: "minPrize cannot exceed maxPrize" }
                });
            }
        }

        if (
            req.query.fromDate ||
            req.query.toDate
        ) {
            filter.registrationDeadline = {};

            if (req.query.fromDate) {
                const fromDate = new Date(req.query.fromDate);
                if (Number.isNaN(fromDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: { message: "fromDate must be a valid date" }
                    });
                }
                filter.registrationDeadline.$gte = fromDate;
            }

            if (req.query.toDate) {
                const toDate = new Date(req.query.toDate);
                if (Number.isNaN(toDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: { message: "toDate must be a valid date" }
                    });
                }
                filter.registrationDeadline.$lte = toDate;
            }
            if (
                filter.registrationDeadline.$gte &&
                filter.registrationDeadline.$lte &&
                filter.registrationDeadline.$gte > filter.registrationDeadline.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    error: { message: "fromDate cannot be after toDate" }
                });
            }
        }

        /*
         * -----------------------------
         * 4. CURSOR PAGINATION
         * -----------------------------
         */

        if (req.query.cursor) {
            let decodedCursor;
            try {
                decodedCursor = decodeCursor(req.query.cursor, sortName);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    error: { message: error.message }
                });
            }
            filter.$and = [
                ...(filter.$and || []),
                cursorFilter(sortName, decodedCursor)
            ];
        }

        /*
         * -----------------------------
         * 5. SORTING
         * -----------------------------
         */

        const sort = SORTS[sortName].sort;

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
                .populate("sourceListings.source")
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
            nextCursor = encodeCursor(
                hackathons[hackathons.length - 1],
                sortName
            );
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
                                $project: {
                                    sourceIds: {
                                        $setUnion: [
                                            {
                                                $map: {
                                                    input: { $ifNull: ["$sourceListings", []] },
                                                    as: "listing",
                                                    in: "$$listing.source"
                                                }
                                            },
                                            ["$source"]
                                        ]
                                    }
                                }
                            },
                            { $unwind: "$sourceIds" },
                            {
                                $group: {
                                    _id: "$sourceIds",
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

        const etag = `"${crypto
            .createHash("sha256")
            .update(JSON.stringify(response))
            .digest("hex")}"`;

        res.set("ETag", etag);

        res.set(
            "Cache-Control",
            "public, max-age=60"
        );

        res.set("X-Cache", "MISS");

        if (matchesEtag(req.headers["if-none-match"], etag)) {
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
                const cachedResponse = JSON.parse(cachedData);
                const etag = `"${crypto
                    .createHash("sha256")
                    .update(JSON.stringify(cachedResponse))
                    .digest("hex")}"`;
                res.set("ETag", etag);
                res.set(
                    "Cache-Control",
                    "public, max-age=60"
                );

                if (matchesEtag(req.headers["if-none-match"], etag)) {
                    return res.status(304).end();
                }

                res.set(
                    "X-Cache",
                    "HIT"
                );

                return res.status(200).json(cachedResponse);
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
                    .populate("tags")
                    .populate("sourceListings.source");
        } else {
            hackathon =
                await Hackathon.findOne({
                    slug: idOrSlug
                })
                    .populate("organizer")
                    .populate("source")
                    .populate("tags")
                    .populate("sourceListings.source");
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
        const etag = `"${crypto
            .createHash("sha256")
            .update(JSON.stringify(response))
            .digest("hex")}"`;

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
        res.set("ETag", etag);

        res.set(
            "X-Cache",
            "MISS"
        );

        if (matchesEtag(req.headers["if-none-match"], etag)) {
            return res.status(304).end();
        }

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