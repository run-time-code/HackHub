require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");

const hackathonRoutes = require("./routes/hackathonRoutes");

const app = express();

app.use(express.json());

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();

        app.get("/", (req, res) => {
            res.json({
                success: true,
                message: "HackHub backend is running"
            });
        });

        app.use("/api/hackathons", hackathonRoutes);

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