const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../models/User");
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

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );
        console.log(`Login successful: ${user.email}`);
        res.status(200).json({
            message: "Login successful",
            token,
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

module.exports = {register, login};