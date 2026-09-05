import Redis from "ioredis";
import { config } from "../config/index.js";

// In-memory fallback cache with TTL support
class MemoryCache {
  private cache = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async del(keyOrPrefix: string): Promise<void> {
    if (keyOrPrefix.endsWith("*")) {
      const prefix = keyOrPrefix.slice(0, -1);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.delete(keyOrPrefix);
    }
  }

  async flushall(): Promise<void> {
    this.cache.clear();
  }
}

const memoryFallback = new MemoryCache();
let redisClient: Redis | null = null;
let isRedisConnected = false;

try {
  redisClient = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Don't hang on connection failure
    reconnectOnError: () => false,
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("Redis connected successfully ⚡");
  });

  redisClient.on("error", () => {
    isRedisConnected = false;
  });

  // Attempt initial connection without blocking process
  redisClient.connect().catch(() => {
    isRedisConnected = false;
  });
} catch {
  isRedisConnected = false;
}

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch {
    // Fall back to memory
  }
  const memData = await memoryFallback.get(key);
  return memData ? JSON.parse(memData) : null;
};

export const setCache = async (
  key: string,
  value: any,
  ttlSeconds = 300, // 5 minutes default TTL
): Promise<void> => {
  const serialized = JSON.stringify(value);
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.set(key, serialized, "EX", ttlSeconds);
      return;
    }
  } catch {
    // Fall back to memory
  }
  await memoryFallback.set(key, serialized, ttlSeconds);
};

export const deleteCache = async (keyOrPrefix: string): Promise<void> => {
  try {
    if (isRedisConnected && redisClient) {
      if (keyOrPrefix.includes("*")) {
        const keys = await redisClient.keys(keyOrPrefix);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        await redisClient.del(keyOrPrefix);
      }
    }
  } catch {
    // Continue to memory
  }
  await memoryFallback.del(keyOrPrefix);
};

export const isRedisOnline = (): boolean => isRedisConnected;

export const RedisService = {
  getCache,
  setCache,
  deleteCache,
  isRedisOnline,
};

export default RedisService;
