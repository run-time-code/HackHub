"use strict";

const {
    isRunning,
    listSources,
    recentRuns,
    runScrapers
} = require("../src/scrapers");

// List the registered catalogue sources and whether each one is active.
const getScraperSources = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: {
                running: isRunning(),
                sources: listSources()
            }
        });
    } catch (error) {
        console.error("List scraper sources error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Recent scrape runs, newest first.
const getScraperRuns = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;

        if (!Number.isFinite(limit) || limit < 1) {
            return res.status(400).json({ message: "limit must be a positive number" });
        }

        return res.status(200).json({
            success: true,
            data: { runs: await recentRuns({ limit }) }
        });
    } catch (error) {
        console.error("List scraper runs error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Trigger a scrape on demand. Intended for a single source or a dry run —
// the full daily sweep belongs in the scheduled job because it can outlast an
// HTTP request.
const triggerScrape = async (req, res) => {
    const { sources, dryRun } = req.body || {};

    if (sources !== undefined && (!Array.isArray(sources) || sources.some((source) => typeof source !== "string"))) {
        return res.status(400).json({ message: "sources must be an array of source keys" });
    }

    if (dryRun !== undefined && typeof dryRun !== "boolean") {
        return res.status(400).json({ message: "dryRun must be true or false" });
    }

    if (isRunning()) {
        return res.status(409).json({ message: "A scrape is already running" });
    }

    try {
        const summary = await runScrapers({
            sources: sources || [],
            dryRun: Boolean(dryRun),
            trigger: "admin"
        });

        return res.status(200).json({
            message: "Scrape finished",
            data: summary
        });
    } catch (error) {
        if (/already running/i.test(error.message || "")) {
            return res.status(409).json({ message: "A scrape is already running" });
        }

        console.error("Trigger scrape error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getScraperRuns,
    getScraperSources,
    triggerScrape
};
