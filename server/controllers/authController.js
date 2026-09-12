const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!validator.isEmail(email)) {
                return res.status(400).json({
                 message: "Invalid email format"
         });
        }

     if (password.length < 6) {
           return res.status(400).json({
           message: "Password must be at least 6 characters"
        });
       }

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        res.status(201).json({
            message: "User registered successfully",
            user: {
                name,
                email,
                password: hashedPassword
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!validator.isEmail(email)) {
    return res.status(400).json({
        message: "Invalid email format"
    });
}

if (password.length < 6) {
    return res.status(400).json({
        message: "Password must be at least 6 characters"
    });
}

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const token = jwt.sign(
            { email: email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports ={register , login};