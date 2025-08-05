import { v4 as uuidv4 } from 'uuid';
import type { GameState, GameMove, GameChoice, PlayerPattern } from '@mind-reader/shared';
import { getCounterMove, determineWinner } from '@mind-reader/shared';
import { PatternAnalyzer } from '../ai/analyzer';
import * as redisOps from '../redis/operations';

export class GameManager {
  private analyzer: PatternAnalyzer;
  private games: Map<string, GameState>;
  private playerApiKeys: Map<string, string>;

  constructor() {
    this.analyzer = new PatternAnalyzer();
    this.games = new Map();
    this.playerApiKeys = new Map();
  }

  // Set player API key
  setPlayerApiKey(playerId: string, apiKey: string) {
    this.playerApiKeys.set(playerId, apiKey);
  }

  // Get player API key
  getPlayerApiKey(playerId: string): string | undefined {
    return this.playerApiKeys.get(playerId);
  }

  // Create a new game
  async createGame(playerId: string, username: string = 'Anonymous'): Promise<GameState> {
    const gameId = uuidv4();
    const gameState: GameState = {
      gameId,
      playerId,
      username,
      playerScore: 0,
      aiScore: 0,
      moves: [],
      currentStreak: 0,
      gameStartTime: Date.now(),
      status: 'playing',
    };

    this.games.set(gameId, gameState);
    await redisOps.saveGameState(gameState);
    
    return gameState;
  }

  // Get game state
  async getGame(gameId: string): Promise<GameState | null> {
    // Check memory first
    if (this.games.has(gameId)) {
      return this.games.get(gameId)!;
    }

    // Check Redis
    const gameState = await redisOps.getGameState(gameId);
    if (gameState) {
      this.games.set(gameId, gameState);
    }
    
    return gameState;
  }

  // Process a player's move
  async processMove(gameId: string, playerId: string, choice: GameChoice, aiPrediction: GameChoice, aiConfidence: number): Promise<GameMove> {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'playing') {
      throw new Error('Game not found or not active');
    }

    if (game.playerId !== playerId) {
      throw new Error('Player not authorized for this game');
    }

    // Check if AI predicted correctly
    const correct = aiPrediction === choice;

    // AI plays the counter-move to its prediction
    const aiChoice = getCounterMove(aiPrediction);

    // Determine winner based on RPS rules
    const winner = determineWinner(choice, aiChoice);

    // Create move record
    const move: GameMove = {
      playerId,
      choice,
      timestamp: Date.now(),
      aiPrediction,
      aiChoice,
      aiConfidence,
      correct,
      winner,
    };

    // Update scores based on RPS winner (not prediction accuracy)
    if (winner === 'ai') {
      game.aiScore++;
      game.currentStreak = 0;
    } else if (winner === 'player') {
      game.playerScore++;
      game.currentStreak++;
    }
    // No score change for ties

    // Add move to game
    game.moves.push(move);

    // Save to Redis
    await redisOps.saveGameState(game);
    await redisOps.addMove(gameId, move);

    // Update metrics
    await redisOps.incrementMetric('total_moves');
    if (correct) {
      await redisOps.incrementMetric('ai_correct_predictions');
    }

    return move;
  }

  // Get player pattern analysis
  async getPlayerPattern(gameId: string): Promise<PlayerPattern> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const pattern = this.analyzer.analyzePattern(game.moves);
    
    // Save pattern to Redis
    await redisOps.savePlayerPattern(game.playerId, pattern);
    
    return pattern;
  }

  // Get AI prediction
  async getAIPrediction(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'playing') {
      throw new Error('Game not found or not active');
    }

    // Get player pattern
    const pattern = this.analyzer.analyzePattern(game.moves);
    
    // Check cache first
    const patternHash = this.analyzer.generatePatternHash(pattern);
    const cached = await redisOps.getCachedAnalysis(patternHash);
    
    if (cached) {
      return cached;
    }

    // Get player's API key
    const apiKey = this.getPlayerApiKey(game.playerId);

    // Generate new prediction
    const analysis = await this.analyzer.predictNextMove(pattern, apiKey);
    
    // Cache the analysis
    await redisOps.cacheAnalysis(patternHash, analysis);
    
    return analysis;
  }

  // End game
  async endGame(gameId: string): Promise<GameState> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.status = 'finished';
    await redisOps.saveGameState(game);

    // Update player stats
    const pattern = await this.getPlayerPattern(gameId);
    const playerWon = game.playerScore > game.aiScore;
    
    await redisOps.updatePlayerStats({
      username: game.username,
      totalWins: playerWon ? 1 : 0,
      totalGames: 1,
      totalMoves: game.moves.length,
      longestStreak: game.currentStreak,
      totalRandomnessScore: pattern.randomnessScore,
      lastPlayed: Date.now(),
    });

    // Clean up from memory
    this.games.delete(gameId);

    return game;
  }

  // Get global statistics
  async getGlobalStats() {
    const totalMoves = await redisOps.getMetric('total_moves');
    const aiCorrect = await redisOps.getMetric('ai_correct_predictions');
    const leaderboard = await redisOps.getLeaderboard(10);

    return {
      totalMoves,
      aiAccuracy: totalMoves > 0 ? (aiCorrect / totalMoves) * 100 : 0,
      leaderboard,
    };
  }
}
