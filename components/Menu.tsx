import { useGameStore } from '@/lib/store';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';

export function Menu() {
  const startLevel = useGameStore(state => state.startLevel);

  return (
    <div className="flex flex-col items-center justify-center p-6 h-full overflow-hidden w-full max-w-md mx-auto">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-20 h-20 bg-stone-900 text-stone-50 rounded-3xl flex items-center justify-center shadow-xl mb-4">
          <Search size={40} className="text-amber-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-1">Misterio</h1>
        <p className="text-stone-500 text-sm font-medium text-center">Encuentra la posición lógica de cada personaje.</p>
      </motion.div>

      <div className="flex flex-col w-full gap-3">
        {[
          { label: 'Muy Fácil', desc: 'Cuadrícula 6x6', color: 'bg-emerald-400', hover: 'hover:bg-emerald-500' },
          { label: 'Fácil', desc: 'Cuadrícula 6x6', color: 'bg-green-500', hover: 'hover:bg-green-600' },
          { label: 'Medio', desc: 'Cuadrícula 7x7', color: 'bg-amber-500', hover: 'hover:bg-amber-600' },
          { label: 'Difícil', desc: 'Cuadrícula 8x8', color: 'bg-rose-500', hover: 'hover:bg-rose-600' },
          { label: 'Experto', desc: 'Cuadrícula 9x9', color: 'bg-purple-600', hover: 'hover:bg-purple-700' }
        ].map((level, i) => (
          <motion.button
            key={level.label}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => startLevel(level.label as any)}
            className={`w-full group relative overflow-hidden rounded-2xl ${level.color} ${level.hover} text-white shadow-sm transition-all active:scale-95`}
          >
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-lg font-bold tracking-wide">{level.label}</span>
              <span className="text-xs font-bold opacity-90 bg-black/10 px-3 py-1 rounded-full">{level.desc}</span>
            </div>
          </motion.button>
        ))}
      </div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-xs text-stone-400 max-w-xs text-center"
      >
        Reglas: Coloca un personaje por fila y columna. Ningún personaje puede compartir asiento.
      </motion.p>
    </div>
  );
}
