"use strict";

const express = require("express");

const {
    getScraperRuns,
    getScraperSources,
    triggerScrape
} = require("../controllers/adminScraperController");

const {
    requireAuth,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require an authenticated admin.
router.use(requireAuth, requireRole("admin"));

// Registered sources + current run state
router.get("/", getScraperSources);

// Recent scrape history
router.get("/runs", getScraperRuns);

// Run one or more sources now (optionally a dry run)
router.post("/run", triggerScrape);

module.exports = router;
