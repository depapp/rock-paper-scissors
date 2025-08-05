'use client';

import { useState, useEffect } from 'react';
import Game from '@/components/Game';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useGameStore } from '@/lib/store';

export default function Home() {
  const { username } = useGameStore();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Check if user has a username (either from localStorage or set manually)
    if (username) {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
  }, [username]);

  if (showWelcome) {
    return <WelcomeScreen />;
  }

  return <Game />;
}
