import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis, disconnectRedis } from './redis/client';
import { GameSocket } from './socket/gameSocket';
import type { ServerToClientEvents, ClientToServerEvents } from '@mind-reader/shared';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000',
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/api/stats', async (_, res) => {
  try {
    // This would be implemented with the game manager
    res.json({ message: 'Stats endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Initialize game socket
const gameSocket = new GameSocket(io);

// Start server
async function startServer() {
  try {
    console.log('Starting server...');
    console.log('Environment variables loaded:', {
      PORT: process.env.PORT || 3001,
      NODE_ENV: process.env.NODE_ENV,
      REDIS_HOST: process.env.REDIS_HOST,
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
    });

    // Connect to Redis
    console.log('Connecting to Redis...');
    await connectRedis();
    console.log('✅ Connected to Redis');

    // Start stats broadcast
    gameSocket.startStatsBroadcast();
    console.log('✅ Stats broadcast started');

    // Start HTTP server
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ WebSocket CORS origin: ${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000'}`);
      console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  await disconnectRedis();
  process.exit(0);
});

// Start the server
startServer();
