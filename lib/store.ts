import { create } from 'zustand';
import { generatePuzzle, PuzzleState, Point, DifficultyLevel } from './generator';

interface CharacterPlacement {
  charId: string;
  r: number;
  c: number;
}

interface HistoryState {
  placements: CharacterPlacement[];
  drafts: Record<string, string[]>;
  crosses: Record<string, boolean>;
}

interface GameState {
  currentView: 'menu' | 'playing' | 'won';
  difficulty: DifficultyLevel;
  puzzle: PuzzleState | null;
  placements: CharacterPlacement[];
  drafts: Record<string, string[]>;
  crosses: Record<string, boolean>;
  history: HistoryState[];
  startTime: number | null;
  endTime: number | null;
  
  startLevel: (difficulty: DifficultyLevel) => void;
  goHome: () => void;
  
  placeCharacter: (charId: string, r: number, c: number) => void;
  removeCharacter: (charId: string) => void;
  
  toggleDraft: (charId: string, r: number, c: number) => void;
  toggleCross: (r: number, c: number) => void;

  undo: () => void;
  clearBoard: () => void;
  checkWin: () => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentView: 'menu',
  difficulty: 'Muy Fácil',
  puzzle: null,
  placements: [],
  drafts: {},
  crosses: {},
  history: [],
  startTime: null,
  endTime: null,

  startLevel: (difficulty) => {
    // Generate a valid puzzle
    let p = null;
    let attempts = 0;
    while (!p && attempts < 10) {
      p = generatePuzzle(difficulty);
      attempts++;
    }
    if (!p) {
      console.error("Could not generate a unique puzzle, falling back to a simpler grid.");
      // Just to prevent crashing, generate an easy one if hard fails totally.
      p = generatePuzzle('Muy Fácil');
      if (!p) return; // give up
    }
    set({ currentView: 'playing', difficulty, puzzle: p, placements: [], drafts: {}, crosses: {}, history: [], startTime: Date.now(), endTime: null });
  },

  goHome: () => set({ currentView: 'menu', puzzle: null, placements: [], drafts: {}, crosses: {}, history: [], startTime: null, endTime: null }),

  placeCharacter: (charId, r, c) => {
    const state = get();
    if (!state.puzzle) return;
    
    // Check if cell is occupied by blocker
    const cell = state.puzzle.cells[r][c];
    if (cell.prop?.type === 'blocker') return;

    // Check if occupied by another char, if so, replace
    // Also remove this char from previous position
    set((prev) => {
      const filtered = prev.placements.filter(p => p.charId !== charId && !(p.r === r && p.c === c));
      const newPlacements = [...filtered, { charId, r, c }];
      
      const newDrafts = { ...prev.drafts };
      const newCrosses = { ...prev.crosses };

      // Add X and clear drafts on row and col for this character's new position
      for (let i = 0; i < state.puzzle!.N; i++) {
        const rowKey = `${r}_${i}`;
        const colKey = `${i}_${c}`;
        
        // For row
        if (i !== c) {
           newCrosses[rowKey] = true;
           delete newDrafts[rowKey];
        }
        // For col
        if (i !== r) {
           newCrosses[colKey] = true;
           delete newDrafts[colKey];
        }
      }
      
      // Clear drafts of this character from ALL other cells
      for (const k in newDrafts) {
        newDrafts[k] = newDrafts[k].filter(id => id !== charId);
        if (newDrafts[k].length === 0) {
          delete newDrafts[k];
        }
      }
      
      // Also remove drafts/crosses for the cell itself
      const cellKey = `${r}_${c}`;
      delete newDrafts[cellKey];
      delete newCrosses[cellKey];

      return { 
        placements: newPlacements, 
        drafts: newDrafts, 
        crosses: newCrosses,
        history: [...prev.history, { placements: prev.placements, drafts: prev.drafts, crosses: prev.crosses }]
      };
    });
  },

  removeCharacter: (charId) => {
    set((prev) => {
      const placement = prev.placements.find(p => p.charId === charId);
      if (!placement) return {};

      const newPlacements = prev.placements.filter(p => p.charId !== charId);
      const newCrosses = { ...prev.crosses };

      // Calculate all cells that are crossed by OTHER placements
      const crossedByOthers = new Set();
      newPlacements.forEach(p => {
        for (let i = 0; i < get().puzzle!.N; i++) {
           if (i !== p.c) crossedByOthers.add(`${p.r}_${i}`);
           if (i !== p.r) crossedByOthers.add(`${i}_${p.c}`);
        }
      });

      // Remove crosses from the removed character's row and column
      // only if they are not crossed by others
      for (let i = 0; i < get().puzzle!.N; i++) {
        const rowKey = `${placement.r}_${i}`;
        const colKey = `${i}_${placement.c}`;
        if (i !== placement.c && !crossedByOthers.has(rowKey)) {
           delete newCrosses[rowKey];
        }
        if (i !== placement.r && !crossedByOthers.has(colKey)) {
           delete newCrosses[colKey];
        }
      }

      return {
        placements: newPlacements,
        crosses: newCrosses,
        history: [...prev.history, { placements: prev.placements, drafts: prev.drafts, crosses: prev.crosses }]
      };
    });
  },

  toggleDraft: (charId, r, c) => {
    set((prev) => {
      const key = `${r}_${c}`;
      const cellDrafts = prev.drafts[key] || [];
      const newDrafts = { ...prev.drafts };
      if (cellDrafts.includes(charId)) {
        const filtered = cellDrafts.filter(id => id !== charId);
        if (filtered.length === 0) {
          delete newDrafts[key];
        } else {
          newDrafts[key] = filtered;
        }
      } else {
        newDrafts[key] = [...cellDrafts, charId];
      }
      return { 
        drafts: newDrafts,
        history: [...prev.history, { placements: prev.placements, drafts: prev.drafts, crosses: prev.crosses }]
      };
    });
  },

  toggleCross: (r, c) => {
    set((prev) => {
      const key = `${r}_${c}`;
      const newCrosses = { ...prev.crosses };
      if (newCrosses[key]) {
        delete newCrosses[key];
      } else {
        newCrosses[key] = true;
      }
      return { 
        crosses: newCrosses,
        history: [...prev.history, { placements: prev.placements, drafts: prev.drafts, crosses: prev.crosses }]
      };
    });
  },

  undo: () => {
    set((prev) => {
      if (prev.history.length === 0) return {};
      const lastState = prev.history[prev.history.length - 1];
      return {
        placements: lastState.placements,
        drafts: lastState.drafts,
        crosses: lastState.crosses,
        history: prev.history.slice(0, -1)
      };
    });
  },

  clearBoard: () => set((prev) => ({ 
    placements: [], 
    drafts: {}, 
    crosses: {},
    history: [...prev.history, { placements: prev.placements, drafts: prev.drafts, crosses: prev.crosses }]
  })),

  checkWin: () => {
    const s = get();
    if (!s.puzzle || s.placements.length !== s.puzzle.N) return false;

    // Check 1 per row & col
    const rSet = new Set();
    const cSet = new Set();
    for (let p of s.placements) {
      rSet.add(p.r);
      cSet.add(p.c);
    }
    if (rSet.size !== s.puzzle.N || cSet.size !== s.puzzle.N) return false;

    // Because the puzzle generator assigns chars and solves simultaneously,
    // we can check if it matches exactly solution.
    let matchesExact = true;
    for (let i = 0; i < s.puzzle.N; i++) {
       const charId = s.puzzle.characters[i].id;
       const solPt = s.puzzle.solution[i];
       const place = s.placements.find(p => p.charId === charId);
       if (!place || place.r !== solPt.r || place.c !== solPt.c) {
          matchesExact = false;
          break;
       }
    }
    
    // Fallback: check if the rules apply exactly
    // since we do backtracking in generation, any valid solution is THE solution.
    // Let's evaluate exactly:
    let ruleMatches = true;
    
    // Check victim rule first
    const victimPlace = s.placements.find(p => s.puzzle?.characters.find(c => c.id === p.charId)?.role === 'víctima');
    if (victimPlace) {
       const victimZone = s.puzzle.cells[victimPlace.r][victimPlace.c].zoneId;
       let charsInZone = 0;
       s.placements.forEach(p => {
          if (s.puzzle!.cells[p.r][p.c].zoneId === victimZone) charsInZone++;
       });
       if (charsInZone !== 2) ruleMatches = false;
    } else {
       ruleMatches = false;
    }
    
    if (matchesExact) {
       set({ currentView: 'won', endTime: Date.now() });
       return true;
    } else if (ruleMatches && !matchesExact) {
       // Since the puzzle guarantees a unique solution from the clues mapped, 
       // it's statistically impossible for ruleMatches to be true and have all rows/cols disjoint
       // while also matching the non-victim clues. Wait, the non-victim clues aren't fully checked here.
       // So we MUST have matchesExact to win, unless we re-evaluate all clues.
       // Because it's a unique solution puzzle, matchesExact is highly sufficient.
       return false;
    }
    
    return false;
  }
}));

// This function is kept for structural reference if complex logic is ever needed.
function checkCluesMatch(placements: CharacterPlacement[], puzzle: PuzzleState): boolean {
   return true;
}
