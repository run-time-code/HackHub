const bcrypt = require("bcryptjs");

const validator = require("validator");
const User = require("../models/User");
const crypto = require("crypto");
const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/tokenUtils");

const {
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieUtils");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            console.log("All fields are required");
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (!validator.isEmail(email)) {
            console.log("Invalid email format");
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (password.length < 6) {
             console.log("Password must be at least 6 characters");
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
             console.log("User already exists");
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });
         console.log("User registered successfully");
        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log("Email and password are required");

            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        if (!validator.isEmail(email)) {
            console.log("Invalid email format");

            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log("Invalid email or password");

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            console.log("Invalid email or password");

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate access token
        const accessToken = generateAccessToken(user);

        // Generate refresh token
        const refreshToken = generateRefreshToken();

        // Hash refresh token before storing it
        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        user.refreshTokenHash = refreshTokenHash;

        await user.save();

        // Send tokens as HTTP-only cookies
        res.cookie(
            "accessToken",
            accessToken,
            accessCookieOptions
        );

        res.cookie(
            "refreshToken",
            refreshToken,
            refreshCookieOptions
        );

        console.log(`Login successful: ${user.email}`);

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            console.log("Refresh token not provided");

            return res.status(401).json({
                message: "Refresh token not provided"
            });
        }

        // Hash the incoming refresh token
        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find the user with this refresh-token hash
        const user = await User.findOne({
            refreshTokenHash
        });

        if (!user) {
            console.log("Invalid refresh token");

            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        // Generate new tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken();

        // Hash the new refresh token
        const newRefreshTokenHash = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        // Replace old refresh-token hash
        user.refreshTokenHash = newRefreshTokenHash;

        await user.save();

        // Send new cookies
        res.cookie(
            "accessToken",
            newAccessToken,
            accessCookieOptions
        );

        res.cookie(
            "refreshToken",
            newRefreshToken,
            refreshCookieOptions
        );

        console.log(`Refresh token rotated: ${user.email}`);

        return res.status(200).json({
            message: "Token refreshed successfully"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const refreshTokenHash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            // Remove the refresh token from the user's record
            await User.findOneAndUpdate(
                { refreshTokenHash },
                { $set: { refreshTokenHash: null } }
            );
        }

        // Clear authentication cookies
        res.clearCookie("accessToken", accessCookieOptions);
        res.clearCookie("refreshToken", refreshCookieOptions);

        console.log("Logout successful");

        return res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {register, login, refreshToken, logout};