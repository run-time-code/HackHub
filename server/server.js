require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/authRoutes");
const reminderRoutes = require("./routes/reminderRoutes");


const app = express();

const PORT = 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/reminders", reminderRoutes);

app.get("/", (req, res) => {
    res.json({ message: "HackHub Backend is running" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});