import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Clock, Share2, Play, Users, Link as LinkIcon, RotateCcw } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/lib/store';

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

function RecordItem({ record, allRecords, onClose }: { record: GameRecord, allRecords: GameRecord[], onClose: () => void }) {
  const { user } = useAuth();
  const startLevel = useGameStore(state => state.startLevel);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const playedCount = allRecords.filter(r => r.seed === record.seed).length;

  const handleReplay = () => {
    startLevel(record.difficulty as any, record.seed);
    onClose();
  };

  const generateUrl = (duelId?: string) => {
    const isAiStudio = window.location.hostname.includes('run.app');
    const baseUrl = isAiStudio 
      ? 'https://albaricoquevaldes.github.io/Murdoku/' 
      : window.location.origin + window.location.pathname;
    
    const url = new URL(baseUrl);
    url.searchParams.set('seed', record.seed.toString());
    url.searchParams.set('level', record.difficulty);
    if (duelId) {
      url.searchParams.set('duel', duelId);
    }
    return url.toString();
  };

  const copyOrShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Juega esta partida de Misterio con mi semilla!',
          url: url,
        });
        return;
      } catch (err) {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const handleShareSeed = () => {
    copyOrShare(generateUrl());
  };

  const handleDuel = async () => {
    if (playedCount > 1) {
      setErrorMsg("No puedes retar a otro jugador si has jugado más de 1 vez a esta semilla.");
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    if (!user) return;

    try {
      // Create a duel document
      const duelRef = await addDoc(collection(db, 'duels'), {
        creatorId: user.uid,
        creatorName: user.displayName || 'Creator',
        seed: record.seed,
        difficulty: record.difficulty,
        creatorTimeMs: record.timeMs,
        createdAt: serverTimestamp()
      });
      
      const duelUrl = generateUrl(duelRef.id);
      copyOrShare(duelUrl);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'duels');
    }
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col gap-2 relative">
      <div className="flex justify-between items-center">
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
      
      <div className="flex gap-2 mt-1">
        <button 
          onClick={handleReplay}
          className="flex-1 flex items-center justify-center gap-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 py-1.5 rounded-lg font-bold text-xs transition-colors"
        >
          <RotateCcw size={14} /> Rejugar
        </button>
        <button 
          onClick={() => setShowShareOptions(!showShareOptions)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-colors ${showShareOptions ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}
        >
          {copied ? <Clock size={14} /> /* copied placeholder */ : <Share2 size={14} />} 
          {copied ? 'Copiado' : 'Compartir'}
        </button>
      </div>

      <AnimatePresence>
        {showShareOptions && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pt-2 border-t border-stone-200 mt-1 flex-col">
              {errorMsg && <p className="text-xs text-red-500 font-medium mb-1">{errorMsg}</p>}
              <div className="flex gap-2">
                <button 
                  onClick={handleShareSeed}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 py-1.5 rounded-md font-semibold text-xs border border-stone-200"
                >
                  <LinkIcon size={12} /> Pasar semilla
                </button>
                <button 
                  onClick={handleDuel}
                  disabled={playedCount > 1}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold text-xs ${playedCount > 1 ? 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-70 border border-stone-300' : 'bg-amber-100 border border-amber-200 hover:bg-amber-200 text-amber-700'}`}
                >
                  <Users size={12} /> Retar a duelo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
             <RecordItem key={record.id} record={record} allRecords={records} onClose={onClose} />
           ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
