import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { Search, LogIn, LogOut, Trophy, Clock, ChevronRight, ChevronLeft, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginWithGoogle, logout } from '@/lib/firebase';
import { StatsModal } from './StatsModal';
import { getTimeLimit } from './Game';
import Image from 'next/image';

const NORMAL_LEVELS = [
  { label: 'Muy Fácil', desc: 'Cuadrícula 6x6', color: 'bg-emerald-400', hover: 'hover:bg-emerald-500' },
  { label: 'Fácil', desc: 'Cuadrícula 6x6', color: 'bg-green-500', hover: 'hover:bg-green-600' },
  { label: 'Medio', desc: 'Cuadrícula 7x7', color: 'bg-amber-500', hover: 'hover:bg-amber-600' },
  { label: 'Difícil', desc: 'Cuadrícula 8x8', color: 'bg-rose-500', hover: 'hover:bg-rose-600' },
  { label: 'Experto', desc: 'Cuadrícula 9x9', color: 'bg-purple-600', hover: 'hover:bg-purple-700' }
];

import { useShallow } from 'zustand/react/shallow';

export function Menu() {
  const { startLevel, completedDifficulties, toggleAllDifficulties } = useGameStore(useShallow(state => ({
    startLevel: state.startLevel,
    completedDifficulties: state.completedDifficulties,
    toggleAllDifficulties: state.toggleAllDifficulties
  })));
  const { user, loading } = useAuth();
  const [showStats, setShowStats] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [modeIdx, setModeIdx] = useState(0); // 0 = Normal, 1 = Time Attack
  const [showLockMessage, setShowLockMessage] = useState(false);

  const isTimeAttackUnlocked = NORMAL_LEVELS.every(l => completedDifficulties.includes(l.label));
  const isAdmin = user?.email === 'albaricoquevaldes@gmail.com';

  const handleLogin = async () => {
    try {
      setLoginError('');
      await loginWithGoogle();
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain') {
        setLoginError('Dominio no autorizado. Actívalo en la consola de Firebase.');
      } else {
        setLoginError('Error al iniciar sesión.');
      }
      setTimeout(() => setLoginError(''), 5000);
    }
  };

  const handleModeSwitch = (dir: number) => {
    let nextIdx = modeIdx + dir;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx > 1) nextIdx = 1;
    setModeIdx(nextIdx);
  };

  return (
    <div className="flex flex-col items-center p-6 h-full overflow-hidden w-full max-w-md mx-auto pt-16">
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        {!loading && (
          user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowStats(true)}
                className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200 shadow-sm hover:bg-white text-stone-700 font-bold text-sm transition-colors"
                title="Mis Partidas"
              >
                <Trophy size={16} className="text-amber-500" />
                <span className="hidden sm:inline">Historial</span>
              </button>
              <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-2 py-1.5 rounded-full border border-stone-200">
                <Image src={user.photoURL!} alt="Avatar" width={24} height={24} referrerPolicy="no-referrer" className="rounded-full" />
                {isAdmin && (
                  <button onClick={toggleAllDifficulties} className="text-stone-500 hover:text-stone-900 flex items-center justify-center p-1 rounded-full hover:bg-stone-200 transition-colors" title={isTimeAttackUnlocked ? "Bloquear niveles (Admin)" : "Desbloquear TODO (Admin)"}>
                    {isTimeAttackUnlocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                )}
                <button onClick={logout} className="text-stone-500 hover:text-stone-900 flex items-center justify-center p-1 rounded-full hover:bg-stone-200 transition-colors" title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-stone-200 shadow-sm text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <LogIn size={16} />
                Inicia sesión para guardar
              </button>
              {loginError && <div className="text-xs text-red-500 bg-white/90 px-2 py-1 rounded shadow-sm max-w-[200px] text-right">{loginError}</div>}
            </div>
          )
        )}
      </div>

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center mb-6 shrink-0"
      >
        <div className="w-16 h-16 bg-stone-900 text-stone-50 rounded-2xl flex items-center justify-center shadow-xl mb-3">
          <Search size={32} className="text-amber-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-1">Misterio</h1>
      </motion.div>

      {/* Mode Selector Window */}
      <div className="w-full flex-1 max-h-[500px] bg-stone-50/50 backdrop-blur-sm border border-stone-200 rounded-3xl p-2 relative overflow-hidden flex flex-col shadow-sm">
        <div className="flex justify-between items-center px-4 py-3 shrink-0">
          <button 
            onClick={() => handleModeSwitch(-1)}
            className={`p-2 rounded-full transition-colors ${modeIdx === 0 ? 'text-stone-300' : 'text-stone-600 hover:bg-stone-200'}`}
            disabled={modeIdx === 0}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-lg font-black text-stone-800 tracking-tight flex items-center gap-2">
            {modeIdx === 0 ? 'MODO NORMAL' : 'CONTRARRELOJ'}
            {modeIdx === 1 && <Clock size={18} className="text-blue-500" />}
          </div>
          <button 
            onClick={() => {
              if (modeIdx === 0 && !isTimeAttackUnlocked) {
                setShowLockMessage(true);
                setTimeout(() => setShowLockMessage(false), 3000);
              } else {
                handleModeSwitch(1);
              }
            }}
            className={`p-2 rounded-full transition-colors leading-none flex items-center justify-center relative ${(modeIdx === 1 || !isTimeAttackUnlocked) ? 'text-stone-300' : 'text-stone-600 hover:bg-stone-200'}`}
            disabled={modeIdx === 1}
          >
            {modeIdx === 0 && !isTimeAttackUnlocked ? <Lock size={20} className="text-stone-400" /> : <ChevronRight size={24} />}
          </button>
        </div>

        <div className="relative flex-1 rounded-2xl overflow-hidden bg-white shadow-inner">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={modeIdx}
              initial={{ x: modeIdx === 1 ? 100 : -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: modeIdx === 1 ? -100 : 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 p-4 overflow-hidden flex flex-col gap-3"
            >
              {modeIdx === 0 ? (
                NORMAL_LEVELS.map((level, i) => {
                  const isCompleted = completedDifficulties.includes(level.label);
                  return (
                    <motion.button
                      key={level.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => startLevel(level.label as any, undefined, undefined, false)}
                      className={`w-full group relative overflow-hidden rounded-2xl ${level.color} ${level.hover} text-white shadow-sm transition-all active:scale-95 shrink-0`}
                    >
                      <div className="px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold tracking-wide">{level.label}</span>
                          {isCompleted && <Trophy size={14} className="text-white/80" />}
                        </div>
                        <span className="text-xs font-bold opacity-90 bg-black/10 px-3 py-1 rounded-full">{level.desc}</span>
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                NORMAL_LEVELS.map((level, i) => (
                  <motion.button
                    key={level.label + '_time'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => startLevel(level.label as any, undefined, undefined, true)}
                    className={`w-full group relative overflow-hidden rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition-all active:scale-95 shrink-0`}
                  >
                    <div className="px-5 py-3.5 flex items-center justify-between">
                      <span className="text-lg font-bold tracking-wide">{level.label}</span>
                      <div className="flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full text-xs font-bold opacity-90">
                        <Clock size={12} />
                        <span>{level.desc} &bull; {Math.floor(getTimeLimit(level.label)/60000)}:{(getTimeLimit(level.label)%60000/1000).toString().padStart(2, '0')} min</span>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <AnimatePresence>
          {showLockMessage && modeIdx === 0 && !isTimeAttackUnlocked && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="absolute inset-x-0 bottom-8 text-center pointer-events-none z-50"
            >
               <div className="inline-block bg-stone-800/90 backdrop-blur text-white text-[10px] whitespace-nowrap font-bold px-3 py-1.5 rounded-full shadow-lg">
                  Completa todos para desbloquear Contrarreloj
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-xs text-stone-400 max-w-xs text-center shrink-0">
        Reglas: Coloca un personaje por fila y columna. Ningún personaje puede compartir asiento.
      </p>
      
      <AnimatePresence>
         {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </AnimatePresence>
    </div>
  );
}
