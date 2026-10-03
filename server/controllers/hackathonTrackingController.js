
const SavedHackathon = require("../models/SavedHackathon");
const Registration = require("../models/Registration");
const Hackathon = require("../models/Hackathon");


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

        const savedHackathon = await SavedHackathon.findOneAndUpdate(
            {
                user,
                hackathon
            },
            {
                $setOnInsert: {
                    user,
                    hackathon
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

        const deleted = await SavedHackathon.findOneAndDelete({
            user,
            hackathon
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

        const tracking = await Registration.findOneAndUpdate(
            {
                user,
                hackathon
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

        const hackathonData = await Hackathon.findOne({
            hackathon_id: hackathon
        });

        if (!hackathonData) {
            console.log("Hackathon not found");

            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        const deadline = new Date(
            hackathonData.registration_deadline
        );

        const status =
            new Date() < deadline
                ? "Ongoing"
                : "Completed";

        console.log(
            `Hackathon status: ${hackathonData.title} - ${status}`
        );

        return res.status(200).json({
            message: "Hackathon status retrieved successfully",
            hackathon: hackathonData.hackathon_id,
            title: hackathonData.title,
            status
        });

    } catch (error) {
        console.error("Get hackathon status error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

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

        const tracking = await Registration.findOneAndUpdate(
            {
                user,
                hackathon
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
    addNotes
};