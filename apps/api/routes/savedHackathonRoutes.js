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

const {
    doubleCsrfProtection
} = require("../middleware/csrfMiddleware");

const router = express.Router();

router.post(
    "/save",
    requireAuth,
    doubleCsrfProtection,
    saveHackathon
);

router.post(
    "/unsave",
    requireAuth,
    doubleCsrfProtection,
    unsaveHackathon
);

router.post(
    "/register",
    requireAuth,
    doubleCsrfProtection,
    markRegistered
);

router.post(
    "/notes",
    requireAuth,
    doubleCsrfProtection,
    addNotes
);

router.get(
    "/status/:hackathon",
    requireAuth,
    getHackathonStatus
);

module.exports = router;