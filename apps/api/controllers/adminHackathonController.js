
const Hackathon = require("../models/Hackathon");
const { invalidateHackathonCache } = require("../src/services/hackathonsService");

// Hide or unhide a hackathon
const toggleHackathonVisibility = async (req, res) => {
    try {
        const { hackathon_id } = req.params;
        const { is_hidden } = req.body;

        if (typeof is_hidden !== "boolean") {
            return res.status(400).json({
                message: "is_hidden must be true or false"
            });
        }

        const hackathon = await Hackathon.findOneAndUpdate(
            { hackathon_id },
            { $set: { is_hidden } },
            { new: true, runValidators: true }
        );

        if (!hackathon) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        invalidateHackathonCache();
        return res.status(200).json({
            message: is_hidden
                ? "Hackathon hidden successfully"
                : "Hackathon unhidden successfully",
            data: hackathon
        });
    } catch (error) {
        console.error("Toggle hackathon visibility error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// Feature or unfeature a hackathon
const toggleHackathonFeatured = async (req, res) => {
    try {
        const { hackathon_id } = req.params;
        const { is_featured } = req.body;

        if (typeof is_featured !== "boolean") {
            return res.status(400).json({
                message: "is_featured must be true or false"
            });
        }

        const hackathon = await Hackathon.findOneAndUpdate(
            { hackathon_id },
            { $set: { is_featured } },
            { new: true, runValidators: true }
        );

        if (!hackathon) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        invalidateHackathonCache();
        return res.status(200).json({
            message: is_featured
                ? "Hackathon featured successfully"
                : "Hackathon unfeatured successfully",
            data: hackathon
        });
    } catch (error) {
        console.error("Toggle hackathon featured error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// Edit hackathon details
const editHackathon = async (req, res) => {
    try {
        const { hackathon_id } = req.params;
        const allowedFields = [
            "title",
            "registration_deadline",
            "is_active"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "Provide at least one valid field to update"
            });
        }

        if (
            updates.title !== undefined &&
            (typeof updates.title !== "string" ||
                !updates.title.trim())
        ) {
            return res.status(400).json({
                message: "title must be a non-empty string"
            });
        }

        if (
            updates.registration_deadline !== undefined &&
            (typeof updates.registration_deadline !== "string" ||
                Number.isNaN(Date.parse(updates.registration_deadline)))
        ) {
            return res.status(400).json({
                message: "registration_deadline must be a valid date string"
            });
        }

        if (
            updates.is_active !== undefined &&
            typeof updates.is_active !== "boolean"
        ) {
            return res.status(400).json({
                message: "is_active must be true or false"
            });
        }

        if (updates.title !== undefined) {
            updates.title = updates.title.trim();
        }

        const hackathon = await Hackathon.findOneAndUpdate(
            { hackathon_id },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!hackathon) {
            return res.status(404).json({
                message: "Hackathon not found"
            });
        }

        invalidateHackathonCache();
        return res.status(200).json({
            message: "Hackathon updated successfully",
            data: hackathon
        });
    } catch (error) {
        console.error("Edit hackathon error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    toggleHackathonVisibility,
    toggleHackathonFeatured,
    editHackathon
};
