
const mongoose = require("mongoose");
const SavedHackathon = require("../models/SavedHackathon");
const Registration = require("../models/Registration");
const Hackathon = require("../models/Hackathon");
const { computeStatus } = require("../src/scrapers/normalize");
const { isHidden } = require("../src/services/hackathonsService");

const MAX_HACKATHON_KEY_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;

// The legacy tracking routes accept the public hackathon id (or slug). They
// used to upsert whatever string arrived, which produced rows that no reader
// could resolve and let callers attach notes to hidden events. Resolve the
// catalogue row first and store its canonical id.
async function resolveVisibleHackathon(value) {
    if (typeof value !== "string") {
        return null;
    }

    const key = value.trim();

    if (!key || key.length > MAX_HACKATHON_KEY_LENGTH) {
        return null;
    }

    const queries = [{ hackathon_id: key }, { slug: key }];

    if (mongoose.Types.ObjectId.isValid(key)) {
        queries.push({ _id: key });
    }

    const hackathon = await Hackathon.findOne({ $or: queries });

    if (!hackathon || isHidden(hackathon)) {
        return null;
    }

    return hackathon;
}


// ==============================
// SAVE HACKATHON
// ==============================
const saveHackathon = async (req, res) => {
    try {
        const { hackathon } = req.body;
        const user = req.user.id;

        if (!hackathon) {
            console.log("Hackathon ID is required");

            return res.status(400).json({
                message: "Hackathon ID is required"
            });
        }

        const catalogueEntry = await resolveVisibleHackathon(hackathon);

        if (!catalogueEntry) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        const hackathonKey = catalogueEntry.hackathon_id;

        const savedHackathon = await SavedHackathon.findOneAndUpdate(
            {
                user,
                hackathon: hackathonKey
            },
            {
                $setOnInsert: {
                    user,
                    hackathon: hackathonKey
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        console.log(
            `Hackathon saved: ${hackathon} by user ${user}`
        );

        return res.status(200).json({
            message: "Hackathon saved successfully",
            data: savedHackathon
        });

    } catch (error) {
        console.error("Save hackathon error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};
// ==============================
// UNSAVE HACKATHON
// ==============================

const unsaveHackathon = async (req, res) => {
    try {
        const { hackathon } = req.body;
        const user = req.user.id;

        if (!hackathon) {
            console.log("Hackathon ID is required");

            return res.status(400).json({
                message: "Hackathon ID is required"
            });
        }

        const catalogueEntry = await resolveVisibleHackathon(hackathon);

        if (!catalogueEntry) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        const deleted = await SavedHackathon.findOneAndDelete({
            user,
            hackathon: catalogueEntry.hackathon_id
        });

        if (!deleted) {
            console.log("Hackathon already unsaved");

            return res.status(200).json({
                message: "Hackathon already unsaved"
            });
        }

        console.log(
            `Hackathon unsaved: ${hackathon} by user ${user}`
        );

        return res.status(200).json({
            message: "Hackathon unsaved successfully"
        });

    } catch (error) {
        console.error("Unsave hackathon error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// MARK HACKATHON AS REGISTERED
// ==============================

const markRegistered = async (req, res) => {
    try {
        const { hackathon } = req.body;
        const user = req.user.id;

        if (!hackathon) {
            console.log("Hackathon ID is required");

            return res.status(400).json({
                message: "Hackathon ID is required"
            });
        }

        const catalogueEntry = await resolveVisibleHackathon(hackathon);

        if (!catalogueEntry) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        const hackathonKey = catalogueEntry.hackathon_id;

        const tracking = await Registration.findOneAndUpdate(
            {
                user,
                hackathon: hackathonKey
            },
            {
                $set: {
                    registered: true
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        console.log(
            `Hackathon marked as registered: ${hackathon} by user ${user}`
        );

        return res.status(200).json({
            message: "Hackathon marked as registered successfully",
            data: tracking
        });

    } catch (error) {
        console.error("Mark registered error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// ==============================
// GET HACKATHON STATUS
// ==============================

const getHackathonStatus = async (req, res) => {
    try {
        const { hackathon } = req.params;

        if (!hackathon) {
            console.log("Hackathon ID is required");

            return res.status(400).json({
                message: "Hackathon ID is required"
            });
        }

        const hackathonData = await resolveVisibleHackathon(hackathon);

        if (!hackathonData) {
            console.log("Hackathon not found");

            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        // Status follows the event lifecycle, not the registration deadline:
        // an event that is still running is Ongoing even after registration
        // closed, and a row without dates is Upcoming rather than Completed.
        const statusCode = computeStatus({
            startDate:
                hackathonData.eventStartDate ||
                hackathonData.event_start_date ||
                hackathonData.event_start,
            endDate:
                hackathonData.eventEndDate ||
                hackathonData.event_end_date ||
                hackathonData.event_end,
            registrationDeadline:
                hackathonData.registrationDeadline ||
                hackathonData.registration_deadline
        });

        const labels = {
            upcoming: "Upcoming",
            ongoing: "Ongoing",
            completed: "Completed"
        };

        const status = labels[statusCode];

        console.log(
            `Hackathon status: ${hackathonData.title} - ${status}`
        );

        return res.status(200).json({
            message: "Hackathon status retrieved successfully",
            hackathon: hackathonData.hackathon_id,
            title: hackathonData.title,
            status,
            statusCode
        });

    } catch (error) {
        console.error("Get hackathon status error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// ==============================
// ADD NOTES
// ==============================

const addNotes = async (req, res) => {
    try {
        const { hackathon, notes } = req.body;
        const user = req.user.id;

        if (!hackathon) {
            console.log("Hackathon ID is required");

            return res.status(400).json({
                message: "Hackathon ID is required"
            });
        }

        if (notes === undefined) {
            console.log("Notes are required");

            return res.status(400).json({
                message: "Notes are required"
            });
        }

        if (typeof notes !== "string") {
            return res.status(400).json({
                message: "Notes must be a string"
            });
        }

        if (notes.length > MAX_NOTES_LENGTH) {
            return res.status(400).json({
                message: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`
            });
        }

        const catalogueEntry = await resolveVisibleHackathon(hackathon);

        if (!catalogueEntry) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        const hackathonKey = catalogueEntry.hackathon_id;

        const tracking = await Registration.findOneAndUpdate(
            {
                user,
                hackathon: hackathonKey
            },
            {
                $set: {
                    notes
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        console.log(
            `Notes updated for hackathon: ${hackathon} by user ${user}`
        );

        return res.status(200).json({
            message: "Notes added successfully",
            data: tracking
        });

    } catch (error) {
        console.error("Add notes error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    saveHackathon,
    unsaveHackathon,
    markRegistered,
    addNotes,
    getHackathonStatus,
};