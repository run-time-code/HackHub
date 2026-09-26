const express = require("express");
const { register , login, refreshToken, logout } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login" , login);
router.post("/refresh", refreshToken);
router.post("/logout" , logout);


router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You accessed a protected route",
        user: req.user
    });
});

module.exports = router;
