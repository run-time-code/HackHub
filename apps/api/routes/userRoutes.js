const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const {
    getMyProfile,
    saveOnboarding,
    updateMyProfile,
    getPublicProfile,
    updateMySkills,
    uploadAvatar,
    removeAvatar,
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

router.delete(
    "/avatar",
    requireAuth,
    doubleCsrfProtection,
    removeAvatar
);

router.put(
    "/change-password",
    requireAuth,
    doubleCsrfProtection,
    changePassword
);

// WA3 account settings call the nested /me/* paths. Keep the flat routes
// above for older clients.
router.put(
    "/me/change-password",
    requireAuth,
    doubleCsrfProtection,
    changePassword
);

router.get(
    "/me/export",
    requireAuth,
    exportMyData
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