'use client';

import { useGameStore } from '@/lib/store';
import { Menu } from '@/components/Menu';
import { Game } from '@/components/Game';

export default function Home() {
  const currentView = useGameStore(state => state.currentView);

  return (
    <main className="min-h-[100dvh] bg-stone-100 flex flex-col items-center js-main-container">
      {currentView === 'menu' && <Menu />}
      {(currentView === 'playing' || currentView === 'won') && <Game />}
    </main>
  );
}
