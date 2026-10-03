const express = require("express");

const {
    saveHackathon,
    unsaveHackathon,
    markRegistered,
    addNotes,
    getHackathonStatus
} = require("../controllers/hackathonTrackingController");

const {
    requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/save", requireAuth, saveHackathon);

router.post("/unsave", requireAuth, unsaveHackathon);

router.post("/register", requireAuth, markRegistered);

router.post("/notes", requireAuth, addNotes);

router.get("/status/:hackathon", requireAuth, getHackathonStatus);

module.exports = router;