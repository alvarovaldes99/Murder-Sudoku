'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { Menu } from '@/components/Menu';
import { Game } from '@/components/Game';

export default function Home() {
  const currentView = useGameStore(state => state.currentView);
  const startLevel = useGameStore(state => state.startLevel);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    
    const searchParams = new URLSearchParams(window.location.search);
    const seed = searchParams.get('seed');
    const levelStr = searchParams.get('level');
    
    if (seed && levelStr) {
      const level = decodeURIComponent(levelStr) as any;
      const seedNum = parseInt(seed, 10);
      if (!isNaN(seedNum)) {
        startLevel(level, seedNum);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [startLevel]);

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-stone-100 flex justify-center js-main-container">
      {currentView === 'menu' && <Menu />}
      {(currentView === 'playing' || currentView === 'won') && <Game />}
    </main>
  );
}
