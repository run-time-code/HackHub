const SavedHackathon = require("../models/SavedHackathon");
const Hackathon = require("../models/Hackathon");
const saveHackathon = async (req, res) => {
    try {
        const { hackathonId } = req.body;

        if (!hackathonId) {
            return res.status(400).json({
                message: "hackathonId is required"
            });
        }

        const existingSave = await SavedHackathon.findOne({
            user: req.user.id,
            hackathon: hackathonId
        });

        if (existingSave) {
            console.log("Hackathon already saved");
            return res.status(409).json({
                message: "Hackathon already saved"
            });
        }

        const savedHackathon = await SavedHackathon.create({
            user: req.user.id,
            hackathon: hackathonId
        });
        console.log("Hackathon saved successfully");
        res.status(201).json({
            message: "Hackathon saved successfully",
            savedHackathon
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const getSavedHackathons = async (req, res) => {
    try {
        const savedHackathons = await SavedHackathon.find({
            user: req.user.id
        }).populate("hackathon");

        res.status(200).json({
            savedHackathons
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const removeSavedHackathon = async (req, res) => {
    try {
        const { hackathonId } = req.params;

        const deleted = await SavedHackathon.findOneAndDelete({
            user: req.user.id,
            hackathon: hackathonId
        });

        if (!deleted) {
            console.log("Saved hackathon not found");
            return res.status(404).json({
                message: "Saved hackathon not found"
            });
        }
        console.log("Hackathon removed from saved list");
        res.status(200).json({
            message: "Hackathon removed from saved list"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    saveHackathon,
    getSavedHackathons,
    removeSavedHackathon
};