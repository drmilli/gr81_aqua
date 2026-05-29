const Redis = require('ioredis');

let redis;
function getRedis() {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    redis = new Redis(url);
  }
  return redis;
}

module.exports = { getRedis };
