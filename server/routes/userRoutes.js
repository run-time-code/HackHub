const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const {
    getMyProfile,
    updateMyProfile,
    getPublicProfile,
    updateMySkills,
    uploadAvatar
} = require("../controllers/userController");

const {
    getSkillTaxonomy
} = require("../controllers/skillController");

const {
    requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();


router.get("/me", requireAuth, getMyProfile);
router.put("/me", requireAuth, updateMyProfile);
router.put("/skills", requireAuth, updateMySkills);
router.get("/skills", getSkillTaxonomy);

router.get("/public/:id", getPublicProfile);
router.put(
    "/avatar",
    requireAuth,
    (req, res, next) => {
        upload.single("avatar")(req, res, (error) => {
            if (error) {
                return res.status(400).json({
                    message: error.message
                });
            }

            next();
        });
    },
    uploadAvatar
);
module.exports = router;