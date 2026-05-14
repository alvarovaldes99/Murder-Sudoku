import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { loginWithGoogle, logout } from '@/lib/firebase';
import { LogIn, LogOut, Trophy } from 'lucide-react';
import { StatsModal } from './StatsModal';
import { AnimatePresence } from 'motion/react';
import Image from 'next/image';

export function Header() {
  const { user, loading } = useAuth();
  const [showStats, setShowStats] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    try {
      setLoginError('');
      await loginWithGoogle();
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain') {
        setLoginError('Dominio no autorizado.');
      } else {
        setLoginError('Error al iniciar sesión.');
      }
      setTimeout(() => setLoginError(''), 5000);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[300] flex flex-col items-end gap-2">
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
      <AnimatePresence>
         {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </AnimatePresence>
    </div>
  );
}
