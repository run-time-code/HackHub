require("dotenv").config();

const {
    redisClient,
    connectRedis
} = require("./config/redis");

const testRedis = async () => {
    try {
        await connectRedis();

        await redisClient.set("hackhub_test", "Redis is working");

        const value =
            await redisClient.get("hackhub_test");

        console.log("Redis test value:", value);

        await redisClient.del("hackhub_test");

        await redisClient.quit();

    } catch (error) {
        console.error("Redis test failed:", error.message);
    }
};

testRedis();