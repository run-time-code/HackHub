const Hackathon = require("../models/Hackathon");
const Organizer = require("../models/Organizer");
const Source = require("../models/Source");
const Tag = require("../models/Tag");

const {
    invalidateHackathonCache
} = require("./cacheService");


// ======================================================
// CREATE SLUG
// ======================================================

const createSlug = (title, externalId) => {

    const titlePart =
        String(title || "hackathon")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    return `${titlePart}-${externalId}`;
};


// ======================================================
// NORMALIZE ARRAY
// ======================================================

const normalizeArray = (value) => {

    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {

        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }

    return String(value)
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
};


// ======================================================
// VALIDATE HACKATHON
// ======================================================

const validateHackathon = (data) => {

    const errors = [];

    if (!data.title) {
        errors.push("title is required");
    }

    if (!data.externalId) {
        errors.push("externalId is required");
    }

    if (!data.source) {
        errors.push("source is required");
    }

    return errors;
};


// ======================================================
// UPSERT ONE HACKATHON
// ======================================================

const upsertHackathon = async (data) => {

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    const errors = validateHackathon(data);

    if (errors.length > 0) {

        return {
            success: false,
            quarantined: true,
            errors
        };
    }


    // --------------------------------------------------
    // SOURCE
    // --------------------------------------------------

    const source =
        await Source.findOneAndUpdate(
            {
                name: data.source
            },
            {
                $set: {
                    website:
                        data.sourceWebsite || "",

                    apiUrl:
                        data.apiUrl || "",

                    isActive: true
                }
            },
            {
                upsert: true,
                new: true
            }
        );


    // --------------------------------------------------
    // ORGANIZER
    // --------------------------------------------------

    const organizerName =
        data.organizer ||
        "Unknown Organizer";


    const organizer =
        await Organizer.findOneAndUpdate(
            {
                name: organizerName
            },
            {
                $setOnInsert: {
                    name: organizerName
                }
            },
            {
                upsert: true,
                new: true
            }
        );


    // --------------------------------------------------
    // TAGS
    // --------------------------------------------------

    const tagNames =
        normalizeArray(data.tags);

    const tagIds = [];


    for (const tagName of tagNames) {

        const normalizedTag =
            tagName
                .toLowerCase()
                .trim();


        const tag =
            await Tag.findOneAndUpdate(
                {
                    name: normalizedTag
                },
                {
                    $setOnInsert: {
                        name: normalizedTag
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            );


        tagIds.push(tag._id);
    }


    // --------------------------------------------------
    // EXTERNAL ID
    // --------------------------------------------------

    const externalId =
        String(data.externalId);


    // --------------------------------------------------
    // CHECK EXISTING HACKATHON
    // --------------------------------------------------

    const existing =
        await Hackathon.findOne({
            source: source._id,
            externalId: externalId
        });


    // --------------------------------------------------
    // PREPARE HACKATHON DATA
    // --------------------------------------------------

    const hackathonData = {

        title:
            data.title,

        slug:
            data.slug ||
            createSlug(
                data.title,
                externalId
            ),

        description:
            data.description || "",

        organizer:
            organizer._id,

        source:
            source._id,

        externalId:
            externalId,

        tags:
            tagIds,

        skills:
            normalizeArray(data.skills),

        domain:
            normalizeArray(data.domain),

        mode:
            ["ONLINE", "OFFLINE", "HYBRID"]
                .includes(
                    String(
                        data.mode || "ONLINE"
                    ).toUpperCase()
                )
                ? String(
                    data.mode || "ONLINE"
                ).toUpperCase()
                : "ONLINE",

        location:
            data.location || "",

        registrationDeadline:
            data.registrationDeadline
                ? new Date(
                    data.registrationDeadline
                )
                : null,

        eventStartDate:
            data.eventStartDate
                ? new Date(
                    data.eventStartDate
                )
                : null,

        eventEndDate:
            data.eventEndDate
                ? new Date(
                    data.eventEndDate
                )
                : null,

        prize:
            Number(data.prize || 0),

        status:
            data.status || "upcoming",

        sourceUrl:
            data.sourceUrl || "",

        isActive:
            data.isActive !== false
    };


    // --------------------------------------------------
    // UPSERT HACKATHON
    // --------------------------------------------------

    const hackathon =
        await Hackathon.findOneAndUpdate(
            {
                source: source._id,
                externalId: externalId
            },
            {
                $set: hackathonData
            },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        );


    // --------------------------------------------------
    // RESULT
    // --------------------------------------------------

    return {

        success: true,

        created:
            !existing,

        updated:
            !!existing,

        hackathon
    };
};


// ======================================================
// BULK INGESTION
// ======================================================

const ingestHackathons = async (records) => {

    const result = {

        received:
            records.length,

        inserted:
            0,

        updated:
            0,

        quarantined:
            0,

        failed:
            0,

        errors:
            []
    };


    // --------------------------------------------------
    // PROCESS EVERY RECORD
    // --------------------------------------------------

    for (const record of records) {

        try {

            const response =
                await upsertHackathon(record);


            // ------------------------------------------
            // QUARANTINED RECORD
            // ------------------------------------------

            if (response.quarantined) {

                result.quarantined++;

                result.errors.push({

                    title:
                        record.title ||
                        "Unknown",

                    errors:
                        response.errors
                });

                continue;
            }


            // ------------------------------------------
            // INSERTED
            // ------------------------------------------

            if (response.created) {

                result.inserted++;
            }


            // ------------------------------------------
            // UPDATED
            // ------------------------------------------

            if (response.updated) {

                result.updated++;
            }

        }

        catch (error) {

            result.failed++;

            result.errors.push({

                title:
                    record.title ||
                    "Unknown",

                error:
                    error.message
            });
        }
    }


    // ==================================================
    // REDIS CACHE INVALIDATION
    // ==================================================

    /*
     * Hackathon data has changed.
     *
     * Remove old cached GET responses so the next
     * API request gets fresh data from MongoDB.
     */

    try {

        await invalidateHackathonCache();

    }

    catch (error) {

        console.error(
            "Redis cache invalidation failed:",
            error.message
        );
    }


    // --------------------------------------------------
    // RETURN RESULT
    // --------------------------------------------------

    return result;
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    createSlug,

    normalizeArray,

    validateHackathon,

    upsertHackathon,

    ingestHackathons
};