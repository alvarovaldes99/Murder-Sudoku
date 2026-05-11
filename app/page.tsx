'use client';

import { useGameStore } from '@/lib/store';
import { Menu } from '@/components/Menu';
import { Game } from '@/components/Game';

export default function Home() {
  const currentView = useGameStore(state => state.currentView);

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-stone-100 flex justify-center js-main-container">
      {currentView === 'menu' && <Menu />}
      {(currentView === 'playing' || currentView === 'won') && <Game />}
    </main>
  );
}
