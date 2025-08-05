'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import Leaderboard from './Leaderboard';

export default function WelcomeScreen() {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);
  const { 
    registerUsername, 
    setUsername: storeUsername, 
    usernameRegistered,
    connected,
    connect 
  } = useGameStore();

  useEffect(() => {
    // Connect to server when component mounts
    connect();
  }, [connect]);

  useEffect(() => {
    // Check if username is already stored in localStorage
    const savedUsername = localStorage.getItem('rps_username');
    if (savedUsername) {
      setUsername(savedUsername);
      storeUsername(savedUsername);
    }
    
    // Check if API key is already stored
    const savedApiKey = localStorage.getItem('rps_gemini_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [storeUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate username
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (trimmedUsername.length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers, - and _');
      return;
    }

    // Validate API key
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setError('Please provide your Gemini API key');
      return;
    }
    if (!trimmedApiKey.startsWith('AI')) {
      setError('Invalid API key format. Gemini API keys start with "AI"');
      return;
    }

    // Save API key
    localStorage.setItem('rps_gemini_api_key', trimmedApiKey);

    // Register username
    registerUsername(trimmedUsername);
    storeUsername(trimmedUsername);
    localStorage.setItem('rps_username', trimmedUsername);
  };

  const handleSkip = () => {
    setError('');
    
    // Check if API key is provided
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setError('Please provide your Gemini API key to play as guest');
      return;
    }
    if (!trimmedApiKey.startsWith('AI')) {
      setError('Invalid API key format. Gemini API keys start with "AI"');
      return;
    }
    
    // Save API key
    localStorage.setItem('rps_gemini_api_key', trimmedApiKey);
    
    // Use anonymous mode
    storeUsername('Anonymous');
    // Don't save username to localStorage
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto h-full min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Left side - Welcome form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center"
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold mb-4">
                Rock Paper Scissors
                <br />
                <span className="text-3xl text-blue-400">Mind Reader</span>
              </h1>
              <p className="text-xl text-gray-400">Can the AI predict your next move?</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto w-full">
              <h2 className="text-2xl font-semibold mb-6 text-center">Welcome, Player!</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-2">
                    Choose your username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                    placeholder="Enter username..."
                    maxLength={20}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="apikey" className="block text-sm font-medium">
                      Gemini API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyInfo(!showApiKeyInfo)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      {showApiKeyInfo ? 'Hide info' : 'How to get?'}
                    </button>
                  </div>
                  <input
                    type="password"
                    id="apikey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                    placeholder="AIza..."
                  />
                  {showApiKeyInfo && (
                    <div className="mt-2 p-3 bg-gray-700/50 rounded-lg text-xs text-gray-300">
                      <p className="mb-1">To get your free Gemini API key:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></li>
                        <li>Sign in with your Google account</li>
                        <li>Click "Create API Key"</li>
                        <li>Copy and paste it here</li>
                      </ol>
                      <p className="mt-2 text-yellow-400">Your API key is stored locally and never sent to our servers.</p>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Start Playing
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Play as Guest
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-gray-400 text-sm">
                <p>Your username will be displayed on the leaderboard</p>
                <p>Guest players won't appear on the leaderboard</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold mb-2">How to Play</h3>
              <div className="text-gray-400 space-y-1">
                <p>✊ Rock beats ✂️ Scissors</p>
                <p>📄 Paper beats ✊ Rock</p>
                <p>✂️ Scissors beats 📄 Paper</p>
              </div>
            </div>
          </motion.div>

          {/* Right side - Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <div className="w-full max-w-md mx-auto">
              <Leaderboard />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
