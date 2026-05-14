import { useEffect, useState, useMemo, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, CheckCircle, X, Pencil, UserCheck, Undo2, Timer, Share2, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CharacterSprite, PropSprite, FloorSprite } from './Sprite';
import type { Prop } from '@/lib/generator';
import { useAuth } from '@/hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type InteractionMode = 'place' | 'draft' | 'cross';

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Game() {
  const { puzzle, placements, drafts, crosses, history, currentView, goHome, placeCharacter, removeCharacter, toggleDraft, toggleCross, checkWin, undo, startTime, endTime, difficulty, gameSeed, currentDuelId } = useGameStore();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [mode, setMode] = useState<InteractionMode>('draft');
  const [now, setNow] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState<boolean>(false);
  const { user, loading: loadingAuth } = useAuth();
  const hasSavedRef = useRef(false);
  const [hasSavedState, setHasSavedState] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    try {
      setLoginError('');
      const { loginWithGoogle } = await import('@/lib/firebase');
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

  const getShareUrl = (duelId?: string) => {
    if (!gameSeed) return '';
    const isAiStudio = window.location.hostname.includes('run.app');
    const baseUrl = isAiStudio 
      ? 'https://albaricoquevaldes.github.io/Murdoku/' 
      : window.location.origin + window.location.pathname;

    const url = new URL(baseUrl);
    url.searchParams.set('seed', gameSeed.toString());
    url.searchParams.set('level', difficulty);
    if (duelId) {
      url.searchParams.set('duel', duelId);
    }
    return url.toString();
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Juega esta partida de Misterio con mi semilla!',
          text: `Podrás resolver este caso? (Dificultad: ${difficulty})`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.error('Error sharing', err);
      }
    }
    
    // Fallback to copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const [duelResults, setDuelResults] = useState<any[]>([]);
  const [loadingDuel, setLoadingDuel] = useState(false);

  useEffect(() => {
    let active = true;
    if (currentView === 'won' && currentDuelId) {
      const fetchDuelRealtime = async () => {
        setLoadingDuel(true);
        try {
          const { onSnapshot, getDoc, doc, collection } = await import('firebase/firestore');
          
          let creatorData: any = null;
          const duelDoc = await getDoc(doc(db, 'duels', currentDuelId));
          if (duelDoc.exists()) {
             const data = duelDoc.data();
             creatorData = { userId: data.creatorId, userName: data.creatorName, timeMs: data.creatorTimeMs };
          }

          const unsub = onSnapshot(collection(db, 'duels', currentDuelId, 'results'), (resSnap) => {
             const results = resSnap.docs.map(d => d.data() as any);
             if (creatorData) results.push(creatorData);
             
             if (active) {
                const uniqueResults = Array.from(new Map(results.map(item => [item.userId, item])).values());
                uniqueResults.sort((a: any, b: any) => a.timeMs - b.timeMs);
                setDuelResults(uniqueResults);
                setLoadingDuel(false);
             }
          }, (err) => {
             console.error('Error fetching duel results:', err);
             if (active) setLoadingDuel(false);
          });
          
          return unsub;
        } catch (e) {
          console.error(e);
          if (active) setLoadingDuel(false);
        }
      };
      
      let unsubscribe: (() => void) | undefined;
      fetchDuelRealtime().then(unsub => {
        if (unsub) unsubscribe = unsub;
      });

      return () => { 
        active = false; 
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentView, currentDuelId, user]); // added user to dependency to refetch after login

  useEffect(() => {
    if (currentView === 'playing') {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentView]);

  // Auto check win
  useEffect(() => {
    if (puzzle && placements.length === puzzle.N) {
      if (checkWin()) {
        if (typeof window !== 'undefined') {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6']
          });
        }

        // Save to Firestore if user is authenticated and not already saved
        if (user && gameSeed !== null && startTime && !hasSavedRef.current) {
           hasSavedRef.current = true;
           const finalTimeMs = (endTime || Date.now()) - startTime;
           const saveRecord = async () => {
             try {
               const { doc, getDoc, setDoc } = await import('firebase/firestore');
               // Ensure user doc exists for security rules fk check
               const userRef = doc(db, 'users', user.uid);
               const userSnap = await getDoc(userRef);
               if (!userSnap.exists()) {
                 await setDoc(userRef, {
                   userId: user.uid,
                   name: (user.displayName || 'Player').slice(0, 50),
                   createdAt: serverTimestamp()
                 });
               }

               await addDoc(collection(db, 'game_records'), {
                 userId: user.uid,
                 seed: gameSeed,
                 difficulty,
                 timeMs: finalTimeMs,
                 solvedAt: serverTimestamp()
               });

               if (currentDuelId) {
                 const challengerName = (user.displayName || 'Challenger').slice(0, 50);
                 await addDoc(collection(db, 'duels', currentDuelId, 'results'), {
                   duelId: currentDuelId,
                   userId: user.uid,
                   userName: challengerName,
                   timeMs: finalTimeMs,
                   playedAt: serverTimestamp()
                 });
               }
               setHasSavedState(true);
             } catch (e: any) {
               console.error('Failed to save record:', e); // just log, we don't handleFirestoreError rigidly if duel missing etc.
               setLoginError(`Error al guardar: ${e.message}`);
               hasSavedRef.current = false;
             }
           };
           saveRecord();
        }
      }
    }
  }, [placements, puzzle, checkWin, user, gameSeed, startTime, difficulty, currentDuelId, endTime]);

  const usedProps = useMemo(() => {
    if (!puzzle) return [];
    const propsMap = new Map<string, Prop>();
    for (let r = 0; r < puzzle.cells.length; r++) {
      for (let c = 0; c < puzzle.cells[r].length; c++) {
        const p = puzzle.cells[r][c].prop;
        if (p && !propsMap.has(p.id)) {
          propsMap.set(p.id, p);
        }
      }
    }
    return Array.from(propsMap.values());
  }, [puzzle]);

  const labelCells = useMemo(() => {
    if (!puzzle) return new Set<string>();
    const cells = new Set<string>();
    puzzle.zonesInfo.forEach(zone => {
      const candidates = [];
      for (let r = 0; r < puzzle.N; r++) {
         for (let c = 0; c < puzzle.N; c++) {
            if (puzzle.cells[r][c].zoneId === zone.id) {
               candidates.push({r, c, hasProp: !!puzzle.cells[r][c].prop});
            }
         }
      }
      const empty = candidates.filter(c => !c.hasProp);
      const lookup = empty.length > 0 ? empty : candidates;
      
      let bestCell = lookup[0];
      let maxRun = 0;
      
      for (const cell of lookup) {
         let run = 1;
         for (let c = cell.c + 1; c < puzzle.N; c++) {
            if (puzzle.cells[cell.r][c].zoneId === zone.id) run++;
            else break;
         }
         if (run > maxRun) {
            maxRun = run;
            bestCell = cell;
         }
      }
      
      if (bestCell) {
         cells.add(`${bestCell.r}_${bestCell.c}`);
      }
    });
    return cells;
  }, [puzzle]);

  if (!puzzle) return null;

  const placedCharIds = placements.map(p => p.charId);
  
  const handleCellClick = (r: number, c: number) => {
    if (currentView === 'won') return;
    
    if (mode === 'cross') {
      toggleCross(r, c);
      return;
    }

    if (mode === 'draft') {
      if (selectedCharId) {
         toggleDraft(selectedCharId, r, c);
      }
      return;
    }

    // Place mode
    const existingP = placements.find(p => p.r === r && p.c === c);
    
    if (selectedCharId) {
       placeCharacter(selectedCharId, r, c);
       setSelectedCharId(null);
    } else if (existingP) {
       removeCharacter(existingP.charId);
       setSelectedCharId(existingP.charId);
    }
  };

  return (
    <div className="flex flex-col w-full h-full max-w-lg lg:max-w-5xl mx-auto bg-stone-50 relative lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:pt-6 lg:px-6 lg:overflow-hidden">
      
      {/* Sticky Top Section */}
      <div className="sticky top-0 z-[100] bg-stone-50/95 backdrop-blur-md pb-3 flex flex-col gap-2 lg:col-start-1 lg:row-start-1 lg:static lg:bg-transparent lg:pb-4 lg:z-10">
        
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-2 bg-white border-b lg:border border-stone-200 shadow-sm lg:rounded-2xl">
          <button onClick={goHome} className="p-1.5 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors -ml-1.5 lg:ml-0">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-baseline justify-center flex-1 gap-3">
            <h2 className="text-lg font-bold text-stone-900">{puzzle.ambientName}</h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400">
              <span className="capitalize">{puzzle.N}x{puzzle.N}</span>
              <span className="flex items-center gap-1">
                <Timer size={12} />
                {startTime ? formatTime((endTime || now) - startTime) : '0:00'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 -mr-1.5 lg:mr-0">
            <button 
              onClick={handleShare}
              title="Compartir semilla"
              className="p-1.5 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors relative"
            >
              {copied ? <CheckCircle size={18} className="text-emerald-500" /> : <Share2 size={20} />}
            </button>
            <div className="w-px h-5 bg-stone-200 mx-1"></div>
            <button 
              onClick={undo} 
              disabled={history.length === 0}
              className={`p-1.5 rounded-full transition-colors ${history.length === 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}
            >
              <Undo2 size={22} />
            </button>
            <button onClick={() => useGameStore.getState().clearBoard()} className="p-1.5 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors">
              <RotateCcw size={22} />
            </button>
          </div>
        </header>

        {/* Actions Bar & Character Tray Wrapper */}
        <div className="px-4 lg:px-0 flex flex-col gap-2">
          {/* Actions Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-stone-200 flex gap-2">
            <button 
              onClick={() => setMode('place')} 
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${mode === 'place' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <UserCheck size={20} className="mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Colocar</span>
            </button>
            <button 
              onClick={() => setMode('draft')} 
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${mode === 'draft' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Pencil size={20} className="mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sospechar</span>
            </button>
            <button 
              onClick={() => {
                setMode('cross');
                setSelectedCharId(null);
               }} 
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${mode === 'cross' ? 'bg-rose-600 text-white shadow-md' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <X size={20} className="mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Descartar</span>
            </button>
          </div>

          {/* Character Tray */}
          <div className={`bg-white p-3 rounded-2xl shadow-sm border transition-colors ${mode !== 'cross' ? 'border-amber-300 shadow-amber-100' : 'border-stone-200'}`}>
           <p className="text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-wider text-center">
              {mode === 'cross' ? 'Modo descarte' : 'Selecciona un sospechoso'}
           </p>
           <div className="flex flex-wrap justify-center gap-2 md:gap-3">
             {puzzle.characters.map(char => {
               const isPlaced = placedCharIds.includes(char.id);
               const isSelected = selectedCharId === char.id;
               return (
                 <button
                   key={char.id}
                   disabled={mode === 'cross' || (mode === 'draft' && isPlaced)}
                   onClick={() => {
                      if(currentView === 'won' || mode === 'cross') return;
                      if (mode === 'place' && isPlaced) {
                         removeCharacter(char.id);
                         setSelectedCharId(char.id);
                      } else {
                         setSelectedCharId(isSelected ? null : char.id);
                      }
                   }}
                   className={`flex flex-col items-center justify-center w-[50px] md:w-[60px] transition-all
                     ${isPlaced ? 'opacity-30 grayscale scale-90' : 'cursor-pointer'}
                     ${isPlaced && mode === 'draft' ? 'cursor-not-allowed' : ''}
                     ${isSelected ? '-translate-y-2 scale-110 drop-shadow-xl' : ''}
                     ${mode === 'cross' ? 'opacity-50 cursor-not-allowed' : ''}
                   `}
                 >
                   <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl md:text-2xl bg-white rounded-full border-2 shadow-sm
                     ${isSelected ? (mode === 'draft' ? 'border-blue-400 ring-4 ring-blue-100' : 'border-amber-400 ring-4 ring-amber-100') : 'border-stone-200'}
                     ${isPlaced ? 'shadow-none' : ''}
                   `}>
                     {char.spriteRow !== undefined && char.spriteCol !== undefined ? (
                        <CharacterSprite row={char.spriteRow} col={char.spriteCol} size={40} bgColor={char.bgColor} />
                     ) : (
                        char.emoji
                     )}
                   </div>
                   <span className={`text-[9px] md:text-[10px] mt-1 font-bold ${isSelected ? (mode === 'draft' ? 'text-blue-600' : 'text-amber-600') : 'text-stone-500'}`}>
                     {char.name}
                   </span>
                 </button>
               )
             })}
           </div>
        </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-6 scrollbar-hide lg:contents">

        {/* Board container */}
        <div className="w-full lg:col-start-2 lg:row-start-1 lg:row-end-3 lg:overflow-visible flex flex-col shrink-0 lg:pt-0">
          <div className="w-full aspect-square bg-stone-900 border-[4px] border-stone-900 rounded-2xl relative flex flex-col mx-auto max-w-[400px] xl:max-w-[420px] shadow-xl md:border-[6px]">
          
          {puzzle.cells.map((row, r) => (
             <div key={r} className="flex flex-1 w-full gap-[2px] mb-[2px] last:mb-0">
               {row.map((cell, c) => {
                 const zone = puzzle.zonesInfo[cell.zoneId];
                 const placement = placements.find(p => p.r === r && p.c === c);
                 const charPlaced = placement ? puzzle.characters.find(char => char.id === placement.charId) : null;
                 const isBlocker = cell.prop?.type === 'blocker';
                 const cellKey = `${r}_${c}`;
                 const isCrossed = crosses[cellKey];
                 const cellDrafts = drafts[cellKey] || [];

                 let hasConflict = false;
                 if (charPlaced) {
                   const rowCount = placements.filter(p => p.r === r).length;
                   const colCount = placements.filter(p => p.c === c).length;
                   if (rowCount > 1 || colCount > 1) hasConflict = true;
                 }

                 const isTopLeft = r === 0 && c === 0;
                 const isTopRight = r === 0 && c === puzzle.N - 1;
                 const isBottomLeft = r === puzzle.N - 1 && c === 0;
                 const isBottomRight = r === puzzle.N - 1 && c === puzzle.N - 1;

                 const cornerClasses = [
                   isTopLeft ? 'rounded-tl-xl md:rounded-tl-[12px]' : '',
                   isTopRight ? 'rounded-tr-xl md:rounded-tr-[12px]' : '',
                   isBottomLeft ? 'rounded-bl-xl md:rounded-bl-[12px]' : '',
                   isBottomRight ? 'rounded-br-xl md:rounded-br-[12px]' : ''
                 ].filter(Boolean).join(' ');

                 return (
                   <button
                     key={c}
                     onClick={() => handleCellClick(r, c)}
                     disabled={isBlocker || currentView === 'won'}
                     className={`relative flex-1 ${cornerClasses} flex flex-col items-center justify-center transition-all ${charPlaced ? 'z-20' : 'z-0'}
                        ${zone.bg}
                        ${isBlocker ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-95 active:scale-95'}
                        ${hasConflict ? 'ring-4 ring-rose-500 ring-inset z-20' : ''}
                     `}
                   >
                     {/* Floor Sprite Background */}
                     {zone.spriteRow !== undefined && zone.spriteCol !== undefined && (
                       <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${cornerClasses}`}>
                         <FloorSprite row={zone.spriteRow} col={zone.spriteCol} ambientName={puzzle.ambientName} />
                       </div>
                     )}

                     {/* Prop Sprite/Emoji */}
                     {cell.prop && !charPlaced && (
                        <div className={`absolute inset-0 z-10 flex items-center justify-center transition-all ${cell.prop.spriteRow !== undefined ? 'scale-100' : (isBlocker ? 'scale-110' : 'scale-100')}`}>
                           {cell.prop.spriteRow !== undefined && cell.prop.spriteCol !== undefined ? (
                              <PropSprite row={cell.prop.spriteRow} col={cell.prop.spriteCol} size="80%" ambientName={puzzle.ambientName} />
                           ) : (
                              <span className="text-xl md:text-2xl">{cell.prop.emoji}</span>
                           )}
                        </div>
                     )}
                     
                     {/* Show valid prop underneath if character is on it but small */}
                     {cell.prop && cell.prop.type === 'valid' && charPlaced && (
                        <div className={`absolute inset-0 flex items-center justify-center z-0 transition-all ${cell.prop.spriteRow !== undefined ? 'opacity-70 scale-100' : 'opacity-70 scale-100'}`}>
                           {cell.prop.spriteRow !== undefined && cell.prop.spriteCol !== undefined ? (
                              <PropSprite row={cell.prop.spriteRow} col={cell.prop.spriteCol} size="80%" ambientName={puzzle.ambientName} />
                           ) : (
                              <span className="text-xl md:text-2xl">{cell.prop.emoji}</span>
                           )}
                        </div>
                     )}
                     
                     {/* Crosses and drafts */}
                     {!charPlaced && !isBlocker && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                          {isCrossed && (
                             <div className="absolute inset-0 flex items-center justify-center z-10">
                               <X size={36} className="text-rose-500/70" strokeWidth={2.5} />
                             </div>
                          )}
                          {!isCrossed && cellDrafts.length > 0 && (
                             <div className="absolute inset-0 p-1 flex flex-wrap content-end gap-[1px] md:gap-[2px] z-10 bg-white/10">
                               {cellDrafts.map(id => {
                                 const draftChar = puzzle.characters.find(c => c.id === id);
                                 return draftChar ? (
                                   <span key={id} className="w-3 h-3 md:w-3.5 md:h-3.5 flex items-center justify-center">
                                     {draftChar.spriteRow !== undefined && draftChar.spriteCol !== undefined ? (
                                       <CharacterSprite row={draftChar.spriteRow} col={draftChar.spriteCol} size={14} bgColor={draftChar.bgColor} />
                                     ) : (
                                       <span className="text-[8px] md:text-[10px] w-full h-full flex items-center justify-center bg-white/90 rounded text-stone-700 shadow-sm leading-none pt-0.5">
                                         {draftChar.emoji}
                                       </span>
                                     )}
                                   </span>
                                 ) : null;
                               })}
                             </div>
                          )}
                        </div>
                     )}

                   </button>
                 )
               })}
             </div>
          ))}

          {/* Lines and Labels Overlay */}
          <div className="absolute inset-0 pointer-events-none z-50 flex flex-col">
             {puzzle.cells.map((row, r) => (
                <div key={`overlay-row-${r}`} className="flex flex-1 w-full gap-[2px] mb-[2px] last:mb-0">
                  {row.map((cell, c) => {
                     const cellKey = `${r}_${c}`;
                     const hasLabel = labelCells.has(cellKey);
                     const placement = placements.find(p => p.r === r && p.c === c);
                     
                     const isRightDiff = c < puzzle.N - 1 && puzzle.cells[r][c + 1].zoneId !== cell.zoneId;
                     const isBottomDiff = r < puzzle.N - 1 && puzzle.cells[r + 1][c].zoneId !== cell.zoneId;

                     return (
                        <div key={`overlay-cell-${c}`} className="flex-1 relative">
                           {isRightDiff && <div className={`absolute -top-[1.5px] -right-[3.5px] w-[5px] bg-stone-900 z-40 ${r === puzzle.N - 1 ? 'bottom-0' : '-bottom-[3.5px]'}`} />}
                           {isBottomDiff && <div className={`absolute -left-[1.5px] -bottom-[3.5px] h-[5px] bg-stone-900 z-40 ${c === puzzle.N - 1 ? 'right-0' : '-right-[3.5px]'}`} />}

                           {hasLabel && (
                              <div className={`absolute top-0 left-0 pointer-events-none z-50 transition-all ${placement ? 'opacity-40' : 'opacity-100'}`}>
                                 <div className="bg-white/90 px-1 py-0.5 border-b border-r border-stone-800 rounded-br-md shadow-sm backdrop-blur-sm relative flex justify-center">
                                    <span style={{ fontSize: '8px' }} className="md:text-[9px] font-black text-stone-900 uppercase tracking-widest leading-none text-center whitespace-nowrap">
                                       {puzzle.zonesInfo[cell.zoneId].name}
                                    </span>
                                 </div>
                              </div>
                           )}
                        </div>
                     )
                  })}
                </div>
             ))}
          </div>

          {/* Characters Overlay */}
          <div className="absolute inset-0 pointer-events-none z-[60] flex flex-col">
             {puzzle.cells.map((row, r) => (
                <div key={`char-row-${r}`} className="flex flex-1 w-full gap-[2px] mb-[2px] last:mb-0">
                  {row.map((cell, c) => {
                     const placement = placements.find(p => p.r === r && p.c === c);
                     const charPlaced = placement ? puzzle.characters.find(cChar => cChar.id === placement.charId) : undefined;
                     return (
                        <div key={`char-cell-${c}`} className="flex-1 relative flex items-center justify-center">
                           <AnimatePresence>
                              {charPlaced && (
                                 <motion.div
                                   initial={{ scale: 0, opacity: 0, rotate: -20 }}
                                   animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                   exit={{ scale: 0, opacity: 0 }}
                                   className="absolute inset-0 z-10 flex flex-col items-center justify-center drop-shadow-md pointer-events-none"
                                 >
                                   {charPlaced.spriteRow !== undefined && charPlaced.spriteCol !== undefined ? (
                                     <CharacterSprite row={charPlaced.spriteRow} col={charPlaced.spriteCol} size="55%" bgColor={charPlaced.bgColor} />
                                   ) : (
                                     <span className="text-2xl md:text-3xl leading-none">{charPlaced.emoji}</span>
                                   )}
                                   <span className="text-[8.5px] md:text-[10px] whitespace-nowrap font-extrabold text-stone-900 bg-white/95 shadow-sm px-1.5 py-0.5 rounded-md absolute -bottom-1 md:-bottom-2 z-20 border border-stone-200">
                                      {charPlaced.name}
                                   </span>
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>
                     )
                  })}
                </div>
             ))}
          </div>

        </div>
        </div> {/* Close Board container */}

        {/* Right Column container (Clues & Legend) */}
        <div className="lg:col-start-1 lg:row-start-2 lg:overflow-y-auto lg:h-full lg:pb-12 xl:pr-4 flex flex-col gap-6 lg:py-0 scrollbar-hide w-full mt-2 lg:mt-0 lg:pr-2">
        {/* Clues List */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
           <h3 className="font-bold text-stone-800 flex items-center mb-4 pb-2 border-b border-stone-100">
              <span className="mr-2">📝</span> Pistas del caso
           </h3>
           <div className="flex flex-col gap-3">
             {puzzle.clues.map((clue, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-stone-100 rounded-full border border-stone-200 text-lg">
                    {clue.character.spriteRow !== undefined && clue.character.spriteCol !== undefined ? (
                       <CharacterSprite row={clue.character.spriteRow} col={clue.character.spriteCol} size={32} bgColor={clue.character.bgColor} />
                    ) : (
                       clue.character.emoji
                    )}
                  </div>
                  <p className="text-sm text-stone-600 font-medium leading-tight">
                    <span className="font-bold text-stone-800 mr-1">{clue.character.name}:</span>
                    {clue.text}
                  </p>
                </div>
             ))}
           </div>
        </div>

        {/* Legend */}
        {usedProps.length > 0 && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
             <h3 className="font-bold text-stone-800 flex items-center mb-3 pb-2 border-b border-stone-100 text-sm">
                <span className="mr-2">🔍</span> Leyenda de objetos
             </h3>
             <div className="flex flex-wrap gap-2">
               {usedProps.map(prop => (
                 <div key={prop.id} className="flex items-center gap-1.5 bg-stone-100 px-2 py-1.5 rounded-lg text-[11px] md:text-xs font-medium text-stone-600 border border-stone-200">
                    {prop.spriteRow !== undefined && prop.spriteCol !== undefined ? (
                       <PropSprite row={prop.spriteRow} col={prop.spriteCol} size={28} ambientName={puzzle.ambientName} />
                    ) : (
                       <span className="text-sm md:text-base leading-none">{prop.emoji}</span>
                    )}
                    <span>{prop.name} {prop.type === 'blocker' && <span className="text-rose-500 font-bold ml-0.5">(bloqueado)</span>}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        </div> {/* Close Right Column container */}

      </div>

      {/* Win Modal Overlay */}
      <AnimatePresence>
        {currentView === 'won' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
               <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                 <CheckCircle size={48} strokeWidth={2.5} />
               </div>
               <h2 className="text-3xl font-extrabold text-stone-900 mb-2">¡Misterio Resuelto!</h2>
               <p className="text-stone-500 font-medium text-center mb-6">
                 Has colocado a todos los personajes correctamente.
               </p>
               <div className="bg-stone-50 border border-stone-200 rounded-xl px-6 py-3 mb-4 w-full flex justify-between items-center">
                 <span className="text-stone-500 font-semibold text-sm uppercase tracking-wider">Tiempo final</span>
                 <span className="text-2xl font-black text-stone-800">{startTime && endTime ? formatTime(endTime - startTime) : '0:00'}</span>
               </div>

               {currentDuelId && (
                 <div className="w-full mb-4 bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <h3 className="text-base font-bold text-stone-800 mb-2">Clasificación del Duelo</h3>
                    {loadingDuel ? (
                      <p className="text-sm text-stone-500">Cargando resultados...</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {duelResults.map((r, i) => (
                          <div key={r.userId} className={`flex justify-between items-center p-2 rounded-lg ${r.userId === user?.uid ? 'bg-emerald-100 border border-emerald-200' : 'bg-white border border-stone-200'}`}>
                            <span className="font-semibold text-stone-700 flex items-center gap-2">
                              {i === 0 && <span className="text-amber-500">🏆</span>}
                              {r.userName}
                            </span>
                            <span className="font-mono font-bold text-stone-600">{formatTime(r.timeMs)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               )}

               {/* Auth / Login to save */}
               {!loadingAuth && !user && (
                 <div className="w-full mb-4 bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center">
                   <p className="text-sm text-stone-600 mb-3 text-center">Inicia sesión para guardar tu resultado y unirte al duelo.</p>
                   <button 
                     onClick={handleLogin}
                     className="w-full flex justify-center items-center gap-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold py-2 rounded-lg transition-all"
                   >
                      Iniciar sesión con Google
                   </button>
                   {loginError && <p className="text-xs text-red-500 mt-2 text-center">{loginError}</p>}
                 </div>
               )}
               {user && hasSavedState && (
                 <p className="text-sm font-semibold text-emerald-600 mb-4 bg-emerald-50 px-4 py-2 border border-emerald-200 rounded-xl w-full text-center">
                   ¡Resultado guardado como {user.displayName}!
                 </p>
               )}

               <button 
                  onClick={handleShare}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-lg py-3 rounded-xl transition-all active:scale-95 shadow-sm mb-3 flex items-center justify-center gap-2"
               >
                 {copied ? <CheckCircle size={20} /> : <Share2 size={20} />}
                 {copied ? '¡Enlace copiado!' : 'Compartir con un amigo'}
               </button>
               <button 
                  onClick={goHome}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-lg py-4 rounded-xl transition-all active:scale-95 shadow-md"
               >
                 Jugar de nuevo
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
