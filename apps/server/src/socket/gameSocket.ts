import { Server, Socket } from 'socket.io';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  GameChoice,
  LeaderboardEntry
} from '@mind-reader/shared';
import { GameManager } from '../game/gameManager';
import * as redisOps from '../redis/operations';

export class GameSocket {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private gameManager: GameManager;
  private playerGames: Map<string, string>; // playerId -> gameId

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.gameManager = new GameManager();
    this.playerGames = new Map();
    this.setupHandlers();
  }

  private setupHandlers() {
    console.log('Setting up WebSocket handlers...');
    
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log('✅ Client connected:', socket.id);
      console.log('Client address:', socket.handshake.address);

      socket.on('registerUsername', async (username: string) => {
        try {
          // Validate username
          if (!username || username.trim().length < 3 || username.trim().length > 20) {
            socket.emit('usernameRegistered', false);
            socket.emit('error', 'Username must be between 3 and 20 characters');
            return;
          }
          
          // Store username in socket data
          socket.data.username = username.trim();
          socket.emit('usernameRegistered', true);
          
          console.log(`Username registered: ${username}`);
        } catch (error) {
          console.error('Error registering username:', error);
          socket.emit('usernameRegistered', false);
          socket.emit('error', 'Failed to register username');
        }
      });

      socket.on('joinGame', async (data: { playerId: string; username: string; apiKey?: string }) => {
        try {
          // Store player data in socket
          socket.data.playerId = data.playerId;
          socket.data.username = data.username || 'Anonymous';
          
          // Store API key if provided
          if (data.apiKey) {
            this.gameManager.setPlayerApiKey(data.playerId, data.apiKey);
          }
          
          // Create new game
          const gameState = await this.gameManager.createGame(data.playerId, data.username);
          this.playerGames.set(data.playerId, gameState.gameId);
          
          // Join room
          socket.join(gameState.gameId);
          
          // Send initial game state
          socket.emit('gameState', gameState);
          
          // Get initial AI prediction
          const analysis = await this.gameManager.getAIPrediction(gameState.gameId);
          socket.emit('aiPrediction', analysis);
          
          console.log(`Player ${data.playerId} joined game ${gameState.gameId}`);
        } catch (error) {
          console.error('Error joining game:', error);
          socket.emit('error', 'Failed to join game');
        }
      });

      socket.on('makeMove', async (choice: GameChoice) => {
        try {
          // Get player's game
          const playerId = socket.data.playerId || socket.id;
          const gameId = this.playerGames.get(playerId);
          
          if (!gameId) {
            socket.emit('error', 'No active game found');
            return;
          }

          // Get current AI prediction
          const currentPrediction = await this.gameManager.getAIPrediction(gameId);
          
          // Process the move
          const move = await this.gameManager.processMove(
            gameId,
            playerId,
            choice,
            currentPrediction.prediction,
            currentPrediction.confidence
          );

          // Get updated game state
          const gameState = await this.gameManager.getGame(gameId);
          if (!gameState) {
            socket.emit('error', 'Game not found');
            return;
          }

          // Send move result
          socket.emit('moveResult', {
            correct: move.correct,
            aiChoice: move.aiChoice,
            winner: move.winner,
            scores: {
              player: gameState.playerScore,
              ai: gameState.aiScore,
            },
          });

          // Send updated game state
          socket.emit('gameState', gameState);

          // Get player pattern
          const pattern = await this.gameManager.getPlayerPattern(gameId);
          socket.emit('patternUpdate', pattern);

          // Get next AI prediction
          const nextPrediction = await this.gameManager.getAIPrediction(gameId);
          socket.emit('aiPrediction', nextPrediction);

          // Broadcast global stats update
          const stats = await this.gameManager.getGlobalStats();
          this.io.emit('globalStats', stats);
          
        } catch (error) {
          console.error('Error processing move:', error);
          socket.emit('error', 'Failed to process move');
        }
      });

      socket.on('requestAnalysis', async () => {
        try {
          const playerId = socket.data.playerId || socket.id;
          const gameId = this.playerGames.get(playerId);
          
          if (!gameId) {
            socket.emit('error', 'No active game found');
            return;
          }

          const pattern = await this.gameManager.getPlayerPattern(gameId);
          socket.emit('patternUpdate', pattern);
        } catch (error) {
          console.error('Error getting analysis:', error);
          socket.emit('error', 'Failed to get analysis');
        }
      });

      socket.on('requestLeaderboard', async () => {
        try {
          const username = socket.data.username;
          const leaderboard = await redisOps.getLeaderboard(10);
          
          // Add rank numbers
          const rankedLeaderboard = leaderboard.map((entry: LeaderboardEntry, index: number) => ({
            ...entry,
            rank: index + 1,
          }));
          
          // Get player's rank if they have a username
          let playerRank = null;
          let playerStats = null;
          
          if (username) {
            playerRank = await redisOps.getPlayerRank(username);
            const stats = await redisOps.getPlayerStats(username);
            if (stats) {
              const winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;
              const avgRandomness = stats.totalGames > 0 ? stats.totalRandomnessScore / stats.totalGames : 0;
              
              playerStats = {
                username: stats.username,
                totalWins: stats.totalWins,
                totalGames: stats.totalGames,
                winRate: Math.round(winRate),
                longestStreak: stats.longestStreak,
                averageRandomness: Math.round(avgRandomness),
                rank: playerRank || undefined,
              } as LeaderboardEntry;
            }
          }
          
          socket.emit('leaderboardUpdate', {
            topPlayers: rankedLeaderboard,
            playerRank: playerRank || undefined,
            playerStats: playerStats || undefined,
          });
        } catch (error) {
          console.error('Error getting leaderboard:', error);
          socket.emit('error', 'Failed to get leaderboard');
        }
      });

      socket.on('leaveGame', async () => {
        try {
          const playerId = socket.data.playerId || socket.id;
          const gameId = this.playerGames.get(playerId);
          
          if (gameId) {
            await this.gameManager.endGame(gameId);
            socket.leave(gameId);
            this.playerGames.delete(playerId);
            console.log(`Player ${playerId} left game ${gameId}`);
          }
        } catch (error) {
          console.error('Error leaving game:', error);
        }
      });

      socket.on('disconnect', async () => {
        console.log('❌ Client disconnected:', socket.id);
        
        // Clean up any active games
        const playerId = socket.data.playerId || socket.id;
        const gameId = this.playerGames.get(playerId);
        
        if (gameId) {
          try {
            await this.gameManager.endGame(gameId);
            this.playerGames.delete(playerId);
          } catch (error) {
            console.error('Error cleaning up game:', error);
          }
        }
      });
    });
  }

  // Broadcast global statistics periodically
  async startStatsBroadcast() {
    setInterval(async () => {
      try {
        const stats = await this.gameManager.getGlobalStats();
        this.io.emit('globalStats', stats);
      } catch (error) {
        console.error('Error broadcasting stats:', error);
      }
    }, 30000); // Every 30 seconds
  }
}
