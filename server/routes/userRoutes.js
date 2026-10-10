const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const {
    getMyProfile,
    saveOnboarding,
    updateMyProfile,
    getPublicProfile,
    updateMySkills,
    uploadAvatar,
    changePassword,
    revokeAllSessions,
    deleteMyAccount,
    exportMyData
} = require("../controllers/userController");

const {
    getSkillTaxonomy
} = require("../controllers/skillController");

const {
    requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();

const {
    doubleCsrfProtection
} = require("../middleware/csrfMiddleware");

router.get("/me", requireAuth, getMyProfile);
router.put("/me/onboarding", requireAuth, doubleCsrfProtection, saveOnboarding);
router.put(
    "/me",
    requireAuth,
    doubleCsrfProtection,
    updateMyProfile
);

router.put(
    "/skills",
    requireAuth,
    doubleCsrfProtection,
    updateMySkills
);

router.get("/skills", getSkillTaxonomy);

router.get("/public/:id", getPublicProfile);

router.put(
    "/avatar",
    requireAuth,
    doubleCsrfProtection,
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

router.put(
    "/change-password",
    requireAuth,
    doubleCsrfProtection,
    changePassword
);

router.post(
    "/revoke-sessions",
    requireAuth,
    doubleCsrfProtection,
    revokeAllSessions
);

router.delete(
    "/me",
    requireAuth,
    doubleCsrfProtection,
    deleteMyAccount
);

router.get(
    "/export",
    requireAuth,
    exportMyData
);

module.exports = router;