
const express = require("express");

const {
    banUser,
    unbanUser
} = require("../controllers/adminUserController");

const {
    requireAuth,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require an authenticated admin.
router.use(requireAuth, requireRole("admin"));

// Ban a user
router.patch("/:userId/ban", banUser);

// Unban a user
router.patch("/:userId/unban", unbanUser);

module.exports = router;
