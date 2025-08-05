import { redisClient } from './client';
import type { GameState, GameMove, PlayerPattern, LeaderboardEntry, PlayerStats } from '@mind-reader/shared';

// Keys
const GAME_KEY = (gameId: string) => `game:${gameId}`;
const PLAYER_PATTERN_KEY = (playerId: string) => `pattern:${playerId}`;
const MOVES_KEY = (gameId: string) => `moves:${gameId}`;

// Game State Operations
export async function saveGameState(gameState: GameState): Promise<void> {
  await redisClient.json.set(GAME_KEY(gameState.gameId), '$', gameState as any);
  await redisClient.expire(GAME_KEY(gameState.gameId), 3600); // 1 hour TTL
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  const state = await redisClient.json.get(GAME_KEY(gameId));
  return state as GameState | null;
}

// Player Pattern Operations
export async function savePlayerPattern(playerId: string, pattern: PlayerPattern): Promise<void> {
  await redisClient.json.set(PLAYER_PATTERN_KEY(playerId), '$', pattern as any);
}

export async function getPlayerPattern(playerId: string): Promise<PlayerPattern | null> {
  const pattern = await redisClient.json.get(PLAYER_PATTERN_KEY(playerId));
  return pattern as PlayerPattern | null;
}

// Move History Operations (using Redis Streams)
export async function addMove(gameId: string, move: GameMove): Promise<void> {
  await redisClient.xAdd(MOVES_KEY(gameId), '*', {
    playerId: move.playerId,
    choice: move.choice,
    timestamp: move.timestamp.toString(),
    aiPrediction: move.aiPrediction,
    aiChoice: move.aiChoice,
    aiConfidence: move.aiConfidence.toString(),
    correct: move.correct.toString(),
    winner: move.winner,
  });
}

export async function getMoves(gameId: string, count: number = 100): Promise<GameMove[]> {
  const moves = await redisClient.xRevRange(MOVES_KEY(gameId), '+', '-', { COUNT: count });
  
  return moves.map(entry => ({
    playerId: entry.message.playerId as string,
    choice: entry.message.choice as any,
    timestamp: parseInt(entry.message.timestamp as string),
    aiPrediction: entry.message.aiPrediction as any,
    aiChoice: entry.message.aiChoice as any,
    aiConfidence: parseFloat(entry.message.aiConfidence as string),
    correct: entry.message.correct === 'true',
    winner: entry.message.winner as 'player' | 'ai' | 'tie',
  }));
}

// Player Stats Operations
export async function updatePlayerStats(stats: PlayerStats): Promise<void> {
  const key = `player:${stats.username}`;
  
  // Get existing stats
  const existing = await redisClient.hGetAll(key);
  
  // Update stats
  const updated: PlayerStats = {
    username: stats.username,
    totalWins: (parseInt(existing.totalWins || '0')) + stats.totalWins,
    totalGames: (parseInt(existing.totalGames || '0')) + stats.totalGames,
    totalMoves: (parseInt(existing.totalMoves || '0')) + stats.totalMoves,
    longestStreak: Math.max(parseInt(existing.longestStreak || '0'), stats.longestStreak),
    totalRandomnessScore: (parseFloat(existing.totalRandomnessScore || '0')) + stats.totalRandomnessScore,
    lastPlayed: stats.lastPlayed,
  };
  
  // Save updated stats
  await redisClient.hSet(key, updated as any);
  
  // Update leaderboard sorted sets
  const winRate = updated.totalGames > 0 ? (updated.totalWins / updated.totalGames) * 100 : 0;
  const avgRandomness = updated.totalGames > 0 ? updated.totalRandomnessScore / updated.totalGames : 0;
  
  // Update multiple leaderboards
  await redisClient.zAdd('leaderboard:wins', { score: updated.totalWins, value: stats.username });
  await redisClient.zAdd('leaderboard:winrate', { score: winRate, value: stats.username });
  await redisClient.zAdd('leaderboard:streak', { score: updated.longestStreak, value: stats.username });
  await redisClient.zAdd('leaderboard:randomness', { score: avgRandomness, value: stats.username });
}

export async function getPlayerStats(username: string): Promise<PlayerStats | null> {
  const stats = await redisClient.hGetAll(`player:${username}`);
  if (!stats.username) return null;
  
  return {
    username: stats.username,
    totalWins: parseInt(stats.totalWins || '0'),
    totalGames: parseInt(stats.totalGames || '0'),
    totalMoves: parseInt(stats.totalMoves || '0'),
    longestStreak: parseInt(stats.longestStreak || '0'),
    totalRandomnessScore: parseFloat(stats.totalRandomnessScore || '0'),
    lastPlayed: parseInt(stats.lastPlayed || '0'),
  };
}

// Leaderboard Operations
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  // Get top players by wins
  const topPlayers = await redisClient.zRange('leaderboard:wins', 0, limit - 1, { REV: true });
  
  const leaderboard: LeaderboardEntry[] = [];
  
  for (const username of topPlayers) {
    const stats = await getPlayerStats(username);
    if (stats) {
      const winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;
      const avgRandomness = stats.totalGames > 0 ? stats.totalRandomnessScore / stats.totalGames : 0;
      
      leaderboard.push({
        username: stats.username,
        totalWins: stats.totalWins,
        totalGames: stats.totalGames,
        winRate: Math.round(winRate),
        longestStreak: stats.longestStreak,
        averageRandomness: Math.round(avgRandomness),
      });
    }
  }
  
  return leaderboard;
}

export async function getPlayerRank(username: string): Promise<number | null> {
  const rank = await redisClient.zRevRank('leaderboard:wins', username);
  return rank !== null ? rank + 1 : null;
}

// Pattern Analysis Cache
export async function cacheAnalysis(patternHash: string, analysis: any, ttl: number = 300): Promise<void> {
  await redisClient.setEx(`analysis:${patternHash}`, ttl, JSON.stringify(analysis));
}

export async function getCachedAnalysis(patternHash: string): Promise<any | null> {
  const cached = await redisClient.get(`analysis:${patternHash}`);
  return cached ? JSON.parse(cached) : null;
}

// Real-time metrics
export async function incrementMetric(metric: string, value: number = 1): Promise<void> {
  await redisClient.incrBy(`metric:${metric}`, value);
}

export async function getMetric(metric: string): Promise<number> {
  const value = await redisClient.get(`metric:${metric}`);
  return value ? parseInt(value) : 0;
}
