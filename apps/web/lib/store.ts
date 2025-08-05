import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type {
  GameState,
  AIAnalysis,
  PlayerPattern,
  GameChoice,
  ServerToClientEvents,
  ClientToServerEvents,
  LeaderboardEntry,
  LeaderboardData,
} from '@mind-reader/shared';

interface GameStore {
  // Socket
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;

  // Game state
  gameState: GameState | null;
  aiPrediction: AIAnalysis | null;
  playerPattern: PlayerPattern | null;
  lastMoveResult: { 
    correct: boolean; 
    aiChoice: GameChoice;
    winner: 'player' | 'ai' | 'tie';
    scores: { player: number; ai: number } 
  } | null;

  // User state
  username: string | null;
  usernameRegistered: boolean;
  playerId: string;

  // Leaderboard
  leaderboard: LeaderboardData | null;

  // Global stats
  globalStats: {
    totalMoves: number;
    aiAccuracy: number;
    leaderboard: LeaderboardEntry[];
  } | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  registerUsername: (username: string) => void;
  joinGame: () => void;
  makeMove: (choice: GameChoice) => void;
  requestAnalysis: () => void;
  requestLeaderboard: () => void;
  leaveGame: () => void;
  setPlayerId: (id: string) => void;
  setUsername: (username: string) => void;
  resetToWelcome: () => void;
  clearLastMoveResult: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  socket: null,
  connected: false,
  gameState: null,
  aiPrediction: null,
  playerPattern: null,
  lastMoveResult: null,
  username: null,
  usernameRegistered: false,
  playerId: '',
  leaderboard: null,
  globalStats: null,
  isLoading: false,
  error: null,

  // Actions
  connect: () => {
    console.log('Attempting to connect to:', SOCKET_URL);
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Socket event handlers
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log('Socket ID:', socket.id);
      set({ connected: true, error: null });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      set({ error: `Connection failed: ${error.message}` });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      set({ connected: false });
    });

    socket.on('gameState', (state) => {
      set({ gameState: state, isLoading: false });
    });

    socket.on('aiPrediction', (analysis) => {
      set({ aiPrediction: analysis });
    });

    socket.on('moveResult', (result) => {
      set({ lastMoveResult: result });
    });

    socket.on('patternUpdate', (pattern) => {
      set({ playerPattern: pattern });
    });

    socket.on('globalStats', (stats) => {
      set({ globalStats: stats });
    });

    socket.on('error', (message) => {
      set({ error: message, isLoading: false });
    });

    socket.on('usernameRegistered', (success) => {
      set({ usernameRegistered: success });
    });

    socket.on('leaderboardUpdate', (data) => {
      set({ leaderboard: data });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  registerUsername: (username: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('registerUsername', username);
    }
  },

  joinGame: () => {
    const { socket, playerId, username } = get();
    if (socket && playerId) {
      set({ isLoading: true, error: null });
      // Get API key from localStorage
      const apiKey = localStorage.getItem('rps_gemini_api_key');
      socket.emit('joinGame', { 
        playerId, 
        username: username || 'Anonymous',
        apiKey: apiKey || undefined
      });
    }
  },

  makeMove: (choice: GameChoice) => {
    const { socket, gameState } = get();
    if (socket && gameState && gameState.status === 'playing') {
      set({ isLoading: true });
      socket.emit('makeMove', choice);
    }
  },

  requestAnalysis: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('requestAnalysis');
    }
  },

  requestLeaderboard: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('requestLeaderboard');
    }
  },

  leaveGame: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leaveGame');
      set({ gameState: null, aiPrediction: null, playerPattern: null });
    }
  },

  setPlayerId: (id: string) => {
    set({ playerId: id });
  },

  setUsername: (username: string) => {
    set({ username });
  },

  resetToWelcome: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leaveGame');
    }
    // Clear username from localStorage to ensure user returns to welcome screen
    localStorage.removeItem('rps_username');
    set({ 
      gameState: null, 
      aiPrediction: null, 
      playerPattern: null,
      username: null,
      usernameRegistered: false,
      lastMoveResult: null,
      error: null,
      playerId: '', // Clear playerId to force regeneration for new game
      leaderboard: null,
      globalStats: null,
      isLoading: false
    });
  },

  clearLastMoveResult: () => {
    set({ lastMoveResult: null });
  },
}));
