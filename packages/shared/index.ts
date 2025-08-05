// Game types
export type GameChoice = 'rock' | 'paper' | 'scissors';

export interface GameMove {
  playerId: string;
  choice: GameChoice;
  timestamp: number;
  aiPrediction: GameChoice;
  aiChoice: GameChoice;  // What the AI actually played
  aiConfidence: number;
  correct: boolean;  // Whether AI's prediction was correct
  winner: 'player' | 'ai' | 'tie';  // Who won based on RPS rules
}

export interface PlayerPattern {
  frequencies: Record<GameChoice, number>;
  transitions: Record<GameChoice, Record<GameChoice, number>>;
  streaks: Record<GameChoice, number>;
  totalMoves: number;
  lastMoves: GameChoice[];
  winRate: number;
  randomnessScore: number;
}

export interface GameState {
  gameId: string;
  playerId: string;
  username: string;
  playerScore: number;
  aiScore: number;
  moves: GameMove[];
  currentStreak: number;
  gameStartTime: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface AIAnalysis {
  prediction: GameChoice;
  confidence: number;
  reasoning: string;
  patternType: 'frequency' | 'sequential' | 'complex' | 'meta' | 'psychological';
  suggestion?: string;
}

// Socket events
export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  aiPrediction: (analysis: AIAnalysis) => void;
  moveResult: (result: { 
    correct: boolean; 
    aiChoice: GameChoice;
    winner: 'player' | 'ai' | 'tie';
    scores: { player: number; ai: number } 
  }) => void;
  patternUpdate: (pattern: PlayerPattern) => void;
  error: (message: string) => void;
  globalStats: (stats: {
    totalMoves: number;
    aiAccuracy: number;
    leaderboard: LeaderboardEntry[];
  }) => void;
  leaderboardUpdate: (leaderboard: LeaderboardData) => void;
  usernameRegistered: (success: boolean) => void;
}

export interface ClientToServerEvents {
  registerUsername: (username: string) => void;
  joinGame: (data: { playerId: string; username: string; apiKey?: string }) => void;
  makeMove: (choice: GameChoice) => void;
  requestAnalysis: () => void;
  requestLeaderboard: () => void;
  leaveGame: () => void;
}

// Leaderboard
export interface LeaderboardEntry {
  username: string;
  totalWins: number;
  totalGames: number;
  winRate: number;
  longestStreak: number;
  averageRandomness: number;
  rank?: number;
}

export interface LeaderboardData {
  topPlayers: LeaderboardEntry[];
  playerRank?: number;
  playerStats?: LeaderboardEntry;
}

// Player stats stored in Redis
export interface PlayerStats {
  username: string;
  totalWins: number;
  totalGames: number;
  totalMoves: number;
  longestStreak: number;
  totalRandomnessScore: number;
  lastPlayed: number;
}

// Constants
export const GAME_CHOICES: GameChoice[] = ['rock', 'paper', 'scissors'];

export const CHOICE_EMOJIS: Record<GameChoice, string> = {
  rock: '✊',
  paper: '📄',
  scissors: '✂️'
};

export const CHOICE_COLORS: Record<GameChoice, string> = {
  rock: '#6b7280',    // gray
  paper: '#3b82f6',   // blue
  scissors: '#ef4444' // red
};

// Game rules: what beats what
export const GAME_RULES: Record<GameChoice, GameChoice> = {
  rock: 'scissors',     // rock beats scissors
  paper: 'rock',        // paper beats rock
  scissors: 'paper'     // scissors beats paper
};

// Helper function to get what beats a given choice
export function getCounterMove(choice: GameChoice): GameChoice {
  // Find what beats the given choice
  const entries = Object.entries(GAME_RULES) as [GameChoice, GameChoice][];
  const counter = entries.find(([_, beats]) => beats === choice);
  return counter ? counter[0] : 'rock'; // Default to rock if not found
}

// Helper function to determine winner
export function determineWinner(playerChoice: GameChoice, aiChoice: GameChoice): 'player' | 'ai' | 'tie' {
  if (playerChoice === aiChoice) return 'tie';
  if (GAME_RULES[playerChoice] === aiChoice) return 'player';
  return 'ai';
}
