require("dotenv").config();

const cookieParser = require("cookie-parser");
const express = require("express");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const savedHackathonRoutes = require("./routes/savedHackathonRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const app = express();

const PORT = 5000;

connectDB();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/saved-hackathons", savedHackathonRoutes);
app.use("/api/users", userRoutes);
app.get("/", (req, res) => {
    res.json({
        message: "HackHub Backend is running"
    });
});
app.use("/api/dashboard", dashboardRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});