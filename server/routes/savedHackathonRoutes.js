const express = require("express");

const {
    saveHackathon,
    getSavedHackathons,
    removeSavedHackathon
} = require("../controllers/savedHackathonController");

const {
    requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, saveHackathon);

router.get("/", requireAuth, getSavedHackathons);

router.delete("/:hackathonId", requireAuth, removeSavedHackathon);

module.exports = router;