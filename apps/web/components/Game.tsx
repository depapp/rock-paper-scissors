'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { GAME_CHOICES, CHOICE_EMOJIS, CHOICE_COLORS, GAME_RULES, type GameChoice } from '@mind-reader/shared';
import Leaderboard from './Leaderboard';

export default function Game() {
  const {
    gameState,
    aiPrediction,
    playerPattern,
    lastMoveResult,
    connected,
    connect,
    makeMove,
    joinGame,
    playerId,
    setPlayerId,
    resetToWelcome,
    clearLastMoveResult,
  } = useGameStore();

  const [selectedChoice, setSelectedChoice] = useState<GameChoice | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastAIPrediction, setLastAIPrediction] = useState<GameChoice | null>(null);
  const [lastAIChoice, setLastAIChoice] = useState<GameChoice | null>(null);
  const [lastWinner, setLastWinner] = useState<'player' | 'ai' | 'tie' | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const username = useGameStore((state) => state.username);

  useEffect(() => {
    // Generate a unique player ID if not set
    if (!playerId) {
      const newPlayerId = `player_${Math.random().toString(36).substr(2, 9)}`;
      setPlayerId(newPlayerId);
    }
    
    connect();
  }, [connect, playerId, setPlayerId]);

  useEffect(() => {
    // Join game once connected and have player ID
    if (connected && playerId && !gameState) {
      joinGame();
    }
  }, [connected, playerId, gameState, joinGame]);

  // Update state when we receive move result
  useEffect(() => {
    if (lastMoveResult && showResult) {
      setLastAIChoice(lastMoveResult.aiChoice);
      setLastWinner(lastMoveResult.winner);
    }
  }, [lastMoveResult, showResult]);

  const handleChoice = async (choice: GameChoice) => {
    if (!gameState || selectedChoice || isThinking) return;
    
    // Clear previous round data immediately
    clearLastMoveResult();
    setLastAIChoice(null);
    setLastWinner(null);
    
    // Store the current AI prediction before making the move
    const currentPrediction = aiPrediction?.prediction || null;
    setLastAIPrediction(currentPrediction);
    
    setSelectedChoice(choice);
    setIsThinking(true);
    
    // Small delay for suspense
    setTimeout(async () => {
      await makeMove(choice);
      setShowResult(true);
      setIsThinking(false);
    }, 500);
  };

  const handleNextRound = () => {
    // Reset for next round
    setSelectedChoice(null);
    setShowResult(false);
    setLastAIPrediction(null);
    setLastAIChoice(null);
    setLastWinner(null);
    clearLastMoveResult();
  };

  const getWhatBeats = (choice: GameChoice): GameChoice => {
    // Returns what beats the given choice
    const beatenBy = Object.entries(GAME_RULES).find(([_, beats]) => beats === choice)?.[0] as GameChoice;
    return beatenBy || 'rock';
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          {/* Top bar with username and leaderboard */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                🏆 Leaderboard
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                Playing as: <span className="font-semibold text-white">{username}</span>
              </span>
              {gameState.moves.length > 0 && (
                <button
                  onClick={() => resetToWelcome()}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  🏁 End Game
                </button>
              )}
            </div>
          </div>
          
          {/* Title section */}
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2">Rock Paper Scissors Mind Reader</h1>
            <p className="text-xl text-gray-400">Can the AI predict your next move?</p>
          </div>
        </div>

        {/* Score */}
        <div className="flex justify-center gap-16 mb-12">
          <div className="text-center">
            <p className="text-gray-400 mb-2">YOU</p>
            <p className="text-6xl font-bold">{gameState.playerScore}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 mb-2">AI</p>
            <p className="text-6xl font-bold">{gameState.aiScore}</p>
          </div>
        </div>

        {/* AI Prediction Area */}
        <div className="bg-gray-800 rounded-lg p-8 mb-12 text-center">
          <AnimatePresence mode="wait">
            {!selectedChoice ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-2xl mb-4">AI is analyzing your patterns...</p>
                {aiPrediction && (
                  <>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <span className="text-gray-400">Confidence</span>
                      <div className="w-48 bg-gray-700 rounded-full h-4 relative">
                        <motion.div
                          className="bg-blue-500 h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${aiPrediction.confidence}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-white font-bold">{aiPrediction.confidence}%</span>
                    </div>
                    <p className="text-gray-400 italic">Pattern type: {aiPrediction.patternType}</p>
                  </>
                )}
              </motion.div>
            ) : !showResult ? (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-pulse">🤔</div>
                  <p className="text-2xl">AI is making its prediction...</p>
                </div>
              </motion.div>
            ) : lastMoveResult && lastAIChoice && lastWinner ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-lg mb-2 text-gray-400">You played</p>
                    <div className="text-5xl mb-2">{CHOICE_EMOJIS[selectedChoice!]}</div>
                    <p className="text-sm capitalize">{selectedChoice}</p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <span className="text-2xl">VS</span>
                  </div>
                  
                  <div>
                    <p className="text-lg mb-2 text-gray-400">AI played</p>
                    <div className="text-5xl mb-2">{CHOICE_EMOJIS[lastAIChoice]}</div>
                    <p className="text-sm capitalize">{lastAIChoice}</p>
                  </div>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="mb-4"
                >
                  {lastWinner === 'player' ? (
                    <div>
                      <p className="text-4xl font-bold text-green-500 mb-2">✅ You Win!</p>
                      <p className="text-gray-400">
                        {selectedChoice && lastAIChoice && `${selectedChoice} beats ${lastAIChoice}!`}
                      </p>
                    </div>
                  ) : lastWinner === 'ai' ? (
                    <div>
                      <p className="text-4xl font-bold text-red-500 mb-2">❌ AI Wins!</p>
                      <p className="text-gray-400">
                        {lastAIChoice && selectedChoice && `${lastAIChoice} beats ${selectedChoice}!`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-4xl font-bold text-yellow-500 mb-2">🤝 It's a Tie!</p>
                      <p className="text-gray-400">You both played the same move!</p>
                    </div>
                  )}
                </motion.div>

                <div className="bg-gray-700/50 rounded-lg p-4 text-sm">
                  <p className="text-gray-400 mb-2">
                    AI predicted: <span className="text-white font-semibold">{lastAIPrediction}</span>
                    {lastMoveResult?.correct ? (
                      <span className="text-green-400 ml-2">✓ Correct prediction!</span>
                    ) : (
                      <span className="text-red-400 ml-2">✗ Wrong prediction</span>
                    )}
                  </p>
                  {aiPrediction && (
                    <p className="text-gray-400 italic">"{aiPrediction.reasoning}"</p>
                  )}
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={handleNextRound}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                >
                  Next Round
                  <span className="text-xl">→</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="loading-result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <p className="text-xl">Processing result...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Choice Buttons */}
        <div className="grid grid-cols-3 gap-8 mb-12 max-w-2xl mx-auto">
          {GAME_CHOICES.map((choice) => (
            <motion.button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={!!selectedChoice || isThinking}
              className={`
                relative p-8 rounded-lg text-center transition-all
                ${selectedChoice === choice 
                  ? 'ring-4 ring-white scale-105' 
                  : selectedChoice 
                    ? 'opacity-50' 
                    : 'hover:scale-105'
                }
                ${!selectedChoice && !isThinking ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
              style={{
                backgroundColor: selectedChoice === choice ? CHOICE_COLORS[choice] : 'rgb(31, 41, 55)',
                borderColor: CHOICE_COLORS[choice],
                borderWidth: '3px',
              }}
              whileHover={!selectedChoice && !isThinking ? { scale: 1.05 } : {}}
              whileTap={!selectedChoice && !isThinking ? { scale: 0.95 } : {}}
            >
              <div className="text-6xl mb-2">{CHOICE_EMOJIS[choice]}</div>
              <div className="text-xl font-semibold capitalize">{choice}</div>
              <div className="text-sm text-gray-400 mt-2">
                beats {GAME_RULES[choice]}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Pattern Analysis */}
        {playerPattern && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Your Patterns</h3>
              
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span>Randomness Score</span>
                  <span>{playerPattern.randomnessScore}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{ width: `${playerPattern.randomnessScore}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2">Choice Frequency</p>
                {GAME_CHOICES.map((choice) => {
                  const percentage = playerPattern.totalMoves > 0
                    ? Math.round((playerPattern.frequencies[choice] / playerPattern.totalMoves) * 100)
                    : 0;
                  return (
                    <div key={choice} className="flex items-center gap-2 mb-1">
                      <span className="w-8 text-2xl">{CHOICE_EMOJIS[choice]}</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-4">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: CHOICE_COLORS[choice],
                          }}
                        />
                      </div>
                      <span className="w-12 text-right">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Game Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Moves</span>
                  <span className="font-bold">{playerPattern.totalMoves}</span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate</span>
                  <span className="font-bold">
                    {playerPattern.totalMoves > 0
                      ? Math.round((gameState.playerScore / playerPattern.totalMoves) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current Streak</span>
                  <span className="font-bold">{gameState.currentStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pattern Type</span>
                  <span className="font-bold capitalize">{aiPrediction?.patternType || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Accuracy</span>
                  <span className="font-bold">
                    {playerPattern.totalMoves > 0
                      ? Math.round((gameState.aiScore / playerPattern.totalMoves) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Game Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mt-8">
            <h3 className="text-xl font-bold mb-4 text-blue-400">📊 How to Get on the Leaderboard</h3>
            <div className="space-y-2 text-gray-300">
              <p>• Play at least one round to start tracking your stats</p>
              <p>• Click the <span className="text-red-400 font-semibold">"End Game"</span> button to save your progress</p>
              <p>• Your score will be saved if you're playing with a username (not as guest)</p>
              <p>• The leaderboard ranks players by total wins across all games</p>
              <p className="mt-4 text-sm text-gray-400">
                💡 Tip: The more you outsmart the AI, the higher you'll rank! Current game: {gameState.playerScore > gameState.aiScore ? 
                  <span className="text-green-400">You're winning!</span> : 
                  gameState.playerScore === gameState.aiScore ? 
                  <span className="text-yellow-400">It's a tie!</span> : 
                  <span className="text-red-400">AI is winning!</span>
                }
              </p>
            </div>
          </div>
          </div>
        )}
      </div>
      
      {/* Leaderboard Modal */}
      <Leaderboard 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  );
}
