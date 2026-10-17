const express = require("express");

const {
    getHackathons,
    getHackathonByIdOrSlug
} = require("../controllers/hackathonController");

const router = express.Router();

router.get("/", getHackathons);

router.get("/:idOrSlug", getHackathonByIdOrSlug);

module.exports = router;