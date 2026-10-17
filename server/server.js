require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");


const cron = require("node-cron");
const {
    purgeDeletedAccounts
} = require("./utils/accountPurge");


const sanitizeMiddleware = require("./middleware/sanitizeMiddleware");
const auditMiddleware = require("./middleware/auditMiddleware");

require("./config/passport");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const savedHackathonRoutes = require("./routes/savedHackathonRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const adminHackathonRoutes = require("./routes/adminHackathonRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB.
connectDB();

// Security headers.
app.use(helmet());

// CORS configuration.
app.use(
    cors({
        origin:
            process.env.FRONTEND_URL ||
            "http://localhost:5173",
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-CSRF-Token"
        ]
    })
);

// Core middleware.
app.use(express.json({ limit: "10kb" }));
app.use(sanitizeMiddleware);
app.use(cookieParser());
app.use(passport.initialize());

// Audit security-relevant authentication requests.
// This must run before the API routes.
app.use(auditMiddleware);

// API routes.
app.use("/api/auth", authRoutes);
app.use("/api/saved-hackathons", savedHackathonRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/admin/hackathons", adminHackathonRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/reports", adminReportRoutes);
// Health check.
app.get("/", (req, res) => {
    res.json({
        message: "HackHub Backend is running"
    });
});
let purgeJobRunning = false;

cron.schedule(
    "0 2 * * *",
    async () => {
        if (purgeJobRunning) {
            console.log("[Account Purge] Skipped: previous job is still running.");
            return;
        }

        purgeJobRunning = true;
        console.log("[Account Purge] Scheduled job started.");

        try {
            const result = await purgeDeletedAccounts();

            console.log("[Account Purge] Completed:", {
                deletedAccounts: result.deletedAccounts,
                deletedRegistrations: result.deletedRegistrations
            });
        } catch (error) {
            console.error("[Account Purge] Failed:", error);
        } finally {
            purgeJobRunning = false;
        }
    },
    {
        timezone: "Asia/Kolkata"
    }
);


// Start server.
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});