import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Clock } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface GameRecord {
  id: string;
  seed: number;
  difficulty: string;
  timeMs: number;
  solvedAt: Date;
}

interface StatsModalProps {
  onClose: () => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StatsModal({ onClose }: StatsModalProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRecords = async () => {
      try {
        const q = query(
          collection(db, 'game_records'),
          where('userId', '==', user.uid),
          orderBy('solvedAt', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetched: GameRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          solvedAt: doc.data().solvedAt?.toDate() || new Date()
        })) as GameRecord[];
        setRecords(fetched);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'game_records');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
         initial={{ scale: 0.9, y: 20 }}
         animate={{ scale: 1, y: 0 }}
         exit={{ scale: 0.9, y: 20, opacity: 0 }}
         className="bg-white rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
           <h2 className="text-xl font-bold flex items-center text-stone-800">
             <Trophy className="mr-2 text-amber-500" />
             Mis Partidas
           </h2>
           <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-100 text-stone-500 transition-colors">
             <X size={24} />
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide flex flex-col gap-3">
           {loading && <p className="text-center text-stone-500 font-medium">Cargando...</p>}
           
           {!loading && records.length === 0 && (
             <div className="text-center py-8">
               <p className="text-stone-500 font-medium">Aún no tienes partidas guardadas.</p>
               <p className="text-sm text-stone-400 mt-1">¡Resuelve tu primer misterio para aparecer aquí!</p>
             </div>
           )}

           {!loading && records.map(record => (
             <div key={record.id} className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex justify-between items-center">
               <div className="flex flex-col">
                 <span className="font-bold text-stone-800 text-sm">{record.difficulty}</span>
                 <span className="text-xs text-stone-400 mt-0.5">
                   Semilla: {record.seed} • {record.solvedAt.toLocaleDateString()}
                 </span>
               </div>
               <div className="bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm flex items-center font-mono font-bold text-sm text-stone-700">
                 <Clock size={14} className="mr-1.5 text-stone-400" />
                 {formatTime(record.timeMs)}
               </div>
             </div>
           ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
