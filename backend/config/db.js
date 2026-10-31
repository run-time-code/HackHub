const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI environment variable is required but not set");
        }

        const configuredPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE);
        const maxPoolSize = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
            ? configuredPoolSize
            : 10;
        const databaseName = process.env.MONGODB_DATABASE || "HackHub";
        await mongoose.connect(uri, {
            dbName: databaseName,
            maxPoolSize,
            serverSelectionTimeoutMS: 10000
        });

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;