
const express = require("express");

const {
    getAdminReport
} = require("../controllers/adminReportController");

const {
    requireAuth,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

// Only authenticated admins can view reports.
router.use(requireAuth, requireRole("admin"));

router.get("/", getAdminReport);

module.exports = router;
