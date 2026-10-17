
const express = require("express");

const {
    toggleHackathonVisibility,
    toggleHackathonFeatured,
    editHackathon
} = require("../controllers/adminHackathonController");

const {
    requireAuth,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require an authenticated admin.
router.use(requireAuth, requireRole("admin"));

// Hide or unhide a hackathon
router.patch(
    "/:hackathon_id/visibility",
    toggleHackathonVisibility
);

// Feature or unfeature a hackathon
router.patch(
    "/:hackathon_id/featured",
    toggleHackathonFeatured
);

// Edit hackathon details
router.patch(
    "/:hackathon_id",
    editHackathon
);

module.exports = router;
