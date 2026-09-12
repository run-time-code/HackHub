const express = require("express");
const { createReminder, getReminders, deleteReminder } = require("../controllers/reminderController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createReminder);

router.get("/", authMiddleware, getReminders);

router.delete("/:id", authMiddleware, deleteReminder);

module.exports = router;