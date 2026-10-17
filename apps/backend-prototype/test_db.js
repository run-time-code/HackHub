require("dotenv").config();

const connectDB = require("./config/db");

const testDatabase = async () => {
    await connectDB();
    console.log("Database test completed.");
    process.exit(0);
};

testDatabase();