const { createClient } = require("redis");

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
});

redisClient.on("connect", () => {
    console.log("Redis connected");
});

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        try {
            await Promise.race([
                redisClient.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Redis connection timeout after 5s")), 5000)
                )
            ]);
            console.log("Redis connected successfully");
        } catch (error) {
            console.warn("Redis unavailable (caching disabled):", error.message);
        }
    }
};

module.exports = {
    redisClient,
    connectRedis
};