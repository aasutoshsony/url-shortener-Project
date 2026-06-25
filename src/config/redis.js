const { createClient } = require("redis");

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    client.on("error", (err) => console.error(`[Redis] Error: ${err.message}`));
    client.on("reconnecting", () => console.warn("[Redis] Reconnecting..."));

    await client.connect();
    console.log("[Redis] Connected");
  } catch (err) {
    console.error(`[Redis] Connection failed: ${err.message}`);
    // Non-fatal: app continues without cache
    client = null;
  }
};

const getClient = () => client;

module.exports = connectRedis;
module.exports.getClient = getClient;
