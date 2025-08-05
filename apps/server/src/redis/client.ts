import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Redis client
export const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('Successfully connected to Redis Cloud');
    
    // Test the connection
    await redisClient.ping();
    console.log('Redis ping successful');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Graceful shutdown
export async function disconnectRedis() {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
}
