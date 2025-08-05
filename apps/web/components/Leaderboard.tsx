'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Zap, Target } from 'lucide-react';
import { useGameStore } from '@/lib/store';
import type { LeaderboardEntry } from '@mind-reader/shared';

interface LeaderboardProps {
  compact?: boolean;
}

export default function Leaderboard({ compact = false }: LeaderboardProps) {
  const { socket, connected } = useGameStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket || !connected) return;

    const requestLeaderboard = () => {
      socket.emit('requestLeaderboard');
    };

    // Request initial leaderboard
    requestLeaderboard();

    // Set up listener
    socket.on('leaderboardUpdate', (data) => {
      setLeaderboard(data.topPlayers || []);
      setPlayerStats(data.playerStats || null);
      setLoading(false);
    });

    // Refresh every 30 seconds
    const interval = setInterval(requestLeaderboard, 30000);

    return () => {
      socket.off('leaderboardUpdate');
      clearInterval(interval);
    };
  }, [socket, connected]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Trophy className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="text-gray-500 font-mono">#{rank}</span>;
    }
  };

  const getStatIcon = (type: 'wins' | 'streak' | 'randomness') => {
    switch (type) {
      case 'wins':
        return <Target className="w-4 h-4" />;
      case 'streak':
        return <TrendingUp className="w-4 h-4" />;
      case 'randomness':
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      <h2 className={`font-bold mb-4 flex items-center gap-2 ${compact ? 'text-xl' : 'text-2xl'}`}>
        <Trophy className="w-6 h-6 text-yellow-400" />
        Leaderboard
      </h2>

      {leaderboard.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No players yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, compact ? 5 : 10).map((player, index) => (
            <motion.div
              key={player.username}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-gray-700/50 rounded-lg p-3 flex items-center justify-between ${
                playerStats?.username === player.username ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center">
                  {getRankIcon(player.rank || index + 1)}
                </div>
                <div>
                  <p className="font-semibold">{player.username}</p>
                  {!compact && (
                    <p className="text-xs text-gray-400">
                      {player.totalGames} games • {player.winRate}% win rate
                    </p>
                  )}
                </div>
              </div>

              <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
                <div className="flex items-center gap-1 text-sm">
                  {getStatIcon('wins')}
                  <span>{player.totalWins}W</span>
                </div>
                {!compact && (
                  <>
                    <div className="flex items-center gap-1 text-sm">
                      {getStatIcon('streak')}
                      <span>{player.longestStreak}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {getStatIcon('randomness')}
                      <span>{player.averageRandomness}%</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {playerStats && !leaderboard.find(p => p.username === playerStats.username) && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Your Stats</p>
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center">
                  <span className="text-blue-400 font-mono">#{playerStats.rank}</span>
                </div>
                <div>
                  <p className="font-semibold">{playerStats.username}</p>
                  <p className="text-xs text-gray-400">
                    {playerStats.totalGames} games • {playerStats.winRate}% win rate
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm">
                  {getStatIcon('wins')}
                  <span>{playerStats.totalWins}W</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
