const express = require("express");

const {
    saveHackathon,
    getSavedHackathons,
    removeSavedHackathon
} = require("../controllers/savedHackathonController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, saveHackathon);

router.get("/", authMiddleware, getSavedHackathons);

router.delete("/:hackathonId", authMiddleware, removeSavedHackathon);

module.exports = router;