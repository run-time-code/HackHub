require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Hackathon = require("../models/Hackathon");
const Organizer = require("../models/Organizer");
const Source = require("../models/Source");
const Tag = require("../models/Tag");
const { syncHackathonReminders } = require("../services/syncHackathonReminders");

const seed = async () => {
    if (process.env.NODE_ENV !== "development" && process.env.ALLOW_SEED_DATA !== "true") {
        throw new Error("Seeding is disabled outside development unless ALLOW_SEED_DATA=true");
    }

    await connectDB();

    const source = await Source.findOneAndUpdate(
        { name: "HackHub Sample" },
        { $set: { website: "https://example.com", apiUrl: "", isActive: true } },
        { upsert: true, new: true }
    );
    const organizer = await Organizer.findOneAndUpdate(
        { name: "HackHub Sample Organizer" },
        { $setOnInsert: { name: "HackHub Sample Organizer", description: "Development seed record" } },
        { upsert: true, new: true }
    );
    const tag = await Tag.findOneAndUpdate(
        { name: "sample" },
        { $setOnInsert: { name: "sample" } },
        { upsert: true, new: true }
    );

    const hackathon = await Hackathon.findOneAndUpdate(
        { source: source._id, externalId: "hackhub-sample-001" },
        {
            $set: {
                title: "HackHub Sample Hackathon",
                slug: "hackhub-sample-hackathon-hackhub-sample-001",
                description: "Sample data for local development and frontend integration.",
                organizer: organizer._id,
                source: source._id,
                externalId: "hackhub-sample-001",
                tags: [tag._id],
                tagNames: [tag.name],
                skills: ["javascript", "api"],
                domain: ["web"],
                mode: "ONLINE",
                location: "Online",
                registrationDeadline: new Date("2099-12-01T00:00:00.000Z"),
                submissionDeadline: new Date("2099-12-14T00:00:00.000Z"),
                eventStartDate: new Date("2099-12-15T00:00:00.000Z"),
                eventEndDate: new Date("2099-12-16T00:00:00.000Z"),
                prize: 1000,
                status: "upcoming",
                sourceUrl: "https://example.com/hackhub-sample-001",
                isActive: true,
                canonicalKey: "hackhub sample hackathon|hackhub sample organizer|2099-12-15",
                isCanonical: true,
                sourceListings: [{
                    source: source._id,
                    externalId: "hackhub-sample-001",
                    sourceUrl: "https://example.com/hackhub-sample-001"
                }]
            }
        },
        { upsert: true, new: true, runValidators: true }
    );

    await syncHackathonReminders(hackathon);

    console.log("Development sample data seeded.");
};

seed()
    .catch((error) => {
        console.error("Seed failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
