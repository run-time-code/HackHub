require("dotenv").config();

const mongoose = require("mongoose");
mongoose.set("autoIndex", false);
const connectDB = require("../config/db");
const Hackathon = require("../models/Hackathon");
const Organizer = require("../models/Organizer");
const Source = require("../models/Source");
const Tag = require("../models/Tag");
const { makeCanonicalKey } = require("../utils/canonicalHackathon");

const migrateLegacyLookupCollection = async (model, legacyName) => {
    const legacyCollection = mongoose.connection.collection(legacyName);
    const legacyRecords = await legacyCollection.find().toArray();
    const idMap = new Map();

    for (const record of legacyRecords) {
        const current = await model.collection.findOne({ name: record.name });
        if (current) {
            idMap.set(String(record._id), current._id);
        } else {
            await model.collection.insertOne(record);
            idMap.set(String(record._id), record._id);
        }
    }

    return idMap;
};

const backfillTagNames = async () => {
    await connectDB();

    const organizerIds = await migrateLegacyLookupCollection(Organizer, "organizers");
    const sourceIds = await migrateLegacyLookupCollection(Source, "sources");
    const tagIds = await migrateLegacyLookupCollection(Tag, "tags");

    const storedHackathons = await Hackathon.collection.find().toArray();
    for (const record of storedHackathons) {
        const updated = {};
        const organizer = organizerIds.get(String(record.organizer));
        const source = sourceIds.get(String(record.source));
        if (organizer) {
            updated.organizer = organizer;
        }
        if (source) {
            updated.source = source;
        }
        if (Array.isArray(record.tags)) {
            updated.tags = record.tags.map(
                (tagId) => tagIds.get(String(tagId)) || tagId
            );
        }
        if (!Array.isArray(record.sourceListings) || record.sourceListings.length === 0) {
            updated.sourceListings = [{
                source: source || record.source,
                externalId: record.externalId,
                sourceUrl: record.sourceUrl || ""
            }];
        }
        if (record.isCanonical === undefined) {
            updated.isCanonical = true;
        }
        if (record.isActive === undefined) {
            updated.isActive = true;
        }
        if (Object.keys(updated).length > 0) {
            await Hackathon.collection.updateOne(
                { _id: record._id },
                { $set: updated }
            );
        }
    }

    const hackathons = await Hackathon.find()
        .sort({ createdAt: 1, _id: 1 })
        .populate("tags", "name")
        .populate("organizer", "name");
    const canonicalByKey = new Map();

    for (const hackathon of hackathons) {
        hackathon.tagNames = hackathon.tags
            .map((tag) => tag && tag.name)
            .filter(Boolean);

        const key = makeCanonicalKey(
            hackathon.title,
            hackathon.organizer && hackathon.organizer.name,
            hackathon.eventStartDate
        );
        hackathon.canonicalKey = key;
        if (key) {
            const canonical = canonicalByKey.get(key);
            if (!canonical) {
                hackathon.isCanonical = true;
                canonicalByKey.set(key, hackathon);
            } else if (String(canonical.source) !== String(hackathon.source)) {
                hackathon.isCanonical = false;
                const listing = {
                    source: hackathon.source,
                    externalId: hackathon.externalId,
                    sourceUrl: hackathon.sourceUrl || ""
                };
                if (!canonical.sourceListings.some(
                    (item) =>
                        String(item.source) === String(listing.source) &&
                        item.externalId === listing.externalId
                )) {
                    canonical.sourceListings.push(listing);
                }
            } else {
                hackathon.isCanonical = true;
            }
        }

        await hackathon.save();
    }

    for (const canonical of canonicalByKey.values()) {
        await canonical.save();
    }

    const textIndexes = (await Hackathon.collection.indexes())
        .filter((index) => index.weights && index.name !== "title_text_description_text_skills_text_domain_text_tagNames_text");
    for (const index of textIndexes) {
        await Hackathon.collection.dropIndex(index.name);
    }

    await Hackathon.collection.createIndex(
        {
            title: "text",
            description: "text",
            skills: "text",
            domain: "text",
            tagNames: "text"
        },
        {
            name: "title_text_description_text_skills_text_domain_text_tagNames_text"
        }
    );

    console.log(`Backfilled tag search text for ${hackathons.length} hackathons.`);
};

backfillTagNames()
    .catch((error) => {
        console.error("Tag search backfill failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
