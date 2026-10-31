require("dotenv").config();

const express = require("express");
const path = require("path");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");

const hackathonRoutes = require("./routes/hackathonRoutes");
const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");

const { scheduleReminderJobs } = require("./services/reminderScheduler");

const app = express();

app.use(express.json());

const startServer = async () => {
    try {
        // Validate JWT_ACCESS_SECRET before starting
        const jwtSecret = process.env.JWT_ACCESS_SECRET;
        if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
            throw new Error("JWT_ACCESS_SECRET must be set to a secret containing at least 32 bytes");
        }

        await connectDB();
        await connectRedis();

        scheduleReminderJobs();

        app.get("/", (req, res) => {
            res.json({
                success: true,
                message: "HackHub backend is running"
            });
        });

        app.get("/api-docs/openapi.yaml", (req, res, next) => {
            res.type("application/yaml").sendFile(
                path.join(__dirname, "docs", "openapi.yaml"),
                (error) => {
                    if (error) {
                        next(error);
                    }
                }
            );
        });

        app.use("/api/hackathons", hackathonRoutes);
        app.use("/api/auth", authRoutes);
        app.use("/api/notifications", notificationRoutes);
        app.use("/api/users", userRoutes);

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();