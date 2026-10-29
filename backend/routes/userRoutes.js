const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const {
    getReminderPreferences,
    updateReminderPreferences
} = require("../controllers/userController");

const router = express.Router();

router.use(requireAuth);
router.get("/me/reminder-preferences", getReminderPreferences);
router.patch("/me/reminder-preferences", updateReminderPreferences);

module.exports = router;
