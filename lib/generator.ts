import { AMBIENTES, ALL_CHARACTERS } from './constants';

export interface Point { r: number; c: number; }

export type Prop = {
  id: string;
  type: 'valid' | 'blocker';
  name: string;
  emoji: string;
  spriteRow?: number;
  spriteCol?: number;
};

export interface Cell {
  r: number;
  c: number;
  zoneId: number;
  prop?: Prop;
}

export interface Clue {
  characterId: string;
  text: string;
  predicate: (r: number, c: number, cells: Cell[][]) => boolean;
  globalPredicate?: (myIdx: number, placedRows: number[], placedCols: number[], cells: Cell[][]) => boolean;
  type?: string;
  score?: number;
}

export interface CharacterItem {
  id: string;
  name: string;
  emoji: string;
  role?: 'víctima' | 'asesino' | 'sospechoso';
  spriteRow?: number;
  spriteCol?: number;
  bgColor?: string;
}

export interface ClueState {
  character: CharacterItem;
  text: string;
}

export interface PuzzleState {
  N: number;
  ambientName: string;
  zonesInfo: { id: number; name: string; bg: string; border: string; spriteRow?: number; spriteCol?: number }[];
  cells: Cell[][];
  characters: CharacterItem[];
  clues: ClueState[];
  solution: Point[]; // solution[i] corresponds to characters[i]
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function getZoneText(zoneName: string): string {
  const fem = ["Cocina", "Biblioteca", "Terraza", "Entrada", "Glorieta", "Nave", "Sacristía", "Cripta", "Capilla", "Caja", "Oficina", "Recepción", "Cafetería"];
  if (zoneName === "Juegos") return "la zona de Juegos";
  if (zoneName === "Pistas") return "las Pistas";
  if (zoneName === "Probadores") return "los Probadores";
  if (fem.includes(zoneName)) return `la ${zoneName}`;
  return `el ${zoneName}`;
}

export type DifficultyLevel = 'Muy Fácil' | 'Fácil' | 'Medio' | 'Difícil' | 'Experto';

export function generatePuzzle(difficulty: DifficultyLevel): PuzzleState | null {
  const N = (difficulty === 'Muy Fácil' || difficulty === 'Fácil') ? 6 :
            difficulty === 'Medio' ? 7 :
            difficulty === 'Difícil' ? 8 : 9;
  const numZones = N; // Keep it simple: N zones for N characters

  for (let attempt = 0; attempt < 2500; attempt++) {
    const ambient = randomItem(AMBIENTES);
    
    // 1. Generate Zones using Seeds
    const cells: Cell[][] = Array.from({ length: N }, (_, r) =>
      Array.from({ length: N }, (_, c) => ({ r, c, zoneId: -1 }))
    );

    const seeds: Point[] = [];
    while (seeds.length < numZones) {
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      if (!seeds.some(s => s.r === r && s.c === c)) {
        cells[r][c].zoneId = seeds.length;
        seeds.push({ r, c });
      }
    }

    let unassigned = N * N - numZones;
    let iterations = 0;
    while (unassigned > 0 && iterations < 1000) {
      iterations++;
      const [dr, dc] = randomItem([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      if (cells[r][c].zoneId === -1) {
        let neighborZone = -1;
        // Simple heuristic: just look for ANY assigned neighbor
        for (let [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && cells[nr][nc].zoneId !== -1) {
            neighborZone = cells[nr][nc].zoneId;
            break;
          }
        }
        if (neighborZone !== -1) {
          cells[r][c].zoneId = neighborZone;
          unassigned--;
        }
      }
    }
    // Fill remaining stragglers with zone 0 (fallback)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (cells[r][c].zoneId === -1) cells[r][c].zoneId = 0;
      }
    }

    // New constraints: every zone must span at least 2 rows and 2 columns
    let zonesValid = true;
    for (let z = 0; z < numZones; z++) {
      let minR = N, maxR = -1;
      let minC = N, maxC = -1;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (cells[r][c].zoneId === z) {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }
      if (maxR - minR < 1 || maxC - minC < 1) {
        zonesValid = false;
        break;
      }
    }
    if (!zonesValid) continue;

    // 2. Select Zones from ambient
    const shZ = shuffle(ambient.zones);
    const zonesInfo = Array.from({ length: numZones }, (_, i) => {
      const zoneName = shZ[i] || `Zona ${i+1}`;
      const originalIndex = ambient.zones.indexOf(zoneName);
      
      const hasSprites = ambient.name === "Mansión" || ambient.name === "Parque" || ambient.name === "Iglesia" || ambient.name === "Tienda";
      return {
        id: i,
        name: zoneName,
        bg: ambient.colors[i % ambient.colors.length],
        border: ambient.borderColors[i % ambient.borderColors.length],
        spriteRow: hasSprites && originalIndex >= 0 ? Math.floor(originalIndex / 5) : undefined,
        spriteCol: hasSprites && originalIndex >= 0 ? originalIndex % 5 : undefined
      };
    });

    // 3. Generate Valid Rook Placement for Solution
    const cols = shuffle(Array.from({ length: N }, (_, i) => i));
    const candidatePaths: Point[] = cols.map((c, r) => ({ r, c }));
    
    // Count zone occupancies in candidatePaths to ensure ONE room has exactly 2 people (Victim & Murderer)
    const zoneCounts: Record<number, Point[]> = {};
    for (const p of candidatePaths) {
      const z = cells[p.r][p.c].zoneId;
      if (!zoneCounts[z]) zoneCounts[z] = [];
      zoneCounts[z].push(p);
    }
    
    const doubleZones = Object.values(zoneCounts).filter(pts => pts.length === 2);
    const multiZones = Object.values(zoneCounts).filter(pts => pts.length > 2);
    
    // We need AT LEAST ONE double zone for the victim/murderer.
    if (doubleZones.length < 1) {
       continue; 
    }
    
    const sharedZonePts = doubleZones[0];
    const otherPts = candidatePaths.filter(p => !sharedZonePts.includes(p));
    
    const solutionPaths = [
       sharedZonePts[0], // Victim will be here
       sharedZonePts[1], // Murderer will be here
       ...otherPts       // Other Suspects
    ];

    // 4. Props Placement
    const isSolution = (r: number, c: number) => solutionPaths.some(p => p.r === r && p.c === c);

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (isSolution(r, c)) {
          if (Math.random() < 0.35) {
            cells[r][c].prop = { ...randomItem(ambient.validProps), type: 'valid' } as Prop;
          }
        } else {
          const rnd = Math.random();
          if (rnd < 0.25) {
            cells[r][c].prop = { ...randomItem(ambient.blockers), type: 'blocker' } as Prop;
          } else if (rnd < 0.35) {
            cells[r][c].prop = { ...randomItem(ambient.validProps), type: 'valid' } as Prop;
          }
        }
      }
    }

    // 5. Pick Characters
    let chars: CharacterItem[] = shuffle(ALL_CHARACTERS).slice(0, N);
    
    // Define Roles: chars[0] is Victim, chars[1] is Murderer, rest are Suspects
    chars[0] = { ...chars[0], id: 'victima', name: 'Víctima', emoji: '💀', role: 'víctima' };
    chars[1] = { ...chars[1], role: 'asesino' };
    for (let i = 2; i < N; i++) chars[i] = { ...chars[i], role: 'sospechoso' };

    // 6. Generate Clues for each character at its solution cell
    const allCluesPerChar: Clue[][] = [];
    for (let i = 0; i < N; i++) {
      const p = solutionPaths[i];
      const cell = cells[p.r][p.c];
      const char = chars[i];
      const cluesForC: Clue[] = [];

      if (i === 0) {
        cluesForC.push({
          type: 'victim',
          characterId: char.id,
          text: `Estaba en la misma zona que el asesino`,
          predicate: (r, c, b) => true // Handled in solver
        });
      } else {
        const myR = p.r;
        const myC = p.c;
        const myCell = cells[myR][myC];
        const myZoneId = myCell.zoneId;
        const zoneName = zonesInfo[myZoneId].name;
        
        let amISolo = true;
        const myZoneMates: number[] = [];
        for (let j = 0; j < N; j++) {
           if (j !== i) {
             const sol = solutionPaths[j];
             if (cells[sol.r][sol.c].zoneId === myZoneId) {
                amISolo = false;
                myZoneMates.push(j);
             }
           }
        }

        // Helper for isNextToProp
        const orth = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const isNextToProp = (r: number, c: number, b: Cell[][], propId: string): boolean => {
           for(const [d2r, d2c] of orth) {
              const n2r = r + d2r;
              const n2c = c + d2c;
              if (n2r >= 0 && n2r < N && n2c >= 0 && n2c < N) {
                 if (b[n2r][n2c].prop?.id === propId && b[n2r][n2c].zoneId === b[r][c].zoneId) return true;
              }
           }
           return false;
        };

        // Zone clue
        cluesForC.push({
          type: 'zone',
          characterId: char.id,
          text: `Estaba en ${getZoneText(zoneName)}`,
          predicate: (r, c, b) => b[r][c].zoneId === myZoneId,
          score: 2
        });

        // Prop clue
        if (myCell.prop && myCell.prop.type === 'valid') {
          const propId = myCell.prop.id;
          const propName = myCell.prop.name;
          cluesForC.push({
            type: 'prop',
            characterId: char.id,
            text: `Estaba sobre ${propName}`,
            predicate: (r, c, b) => b[r][c].prop?.id === propId,
            score: 0
          });

          cluesForC.push({
            type: 'zone_and_prop',
            characterId: char.id,
            text: `Estaba sobre ${propName} en ${getZoneText(zoneName)}`,
            predicate: (r, c, b) => b[r][c].prop?.id === propId && b[r][c].zoneId === myZoneId,
            score: -1
          });

          // Unique Prop
          const othersOnThisProp = solutionPaths.filter((sol, j) => j !== i && cells[sol.r][sol.c].prop?.id === propId).length;
          if (othersOnThisProp === 0) {
             cluesForC.push({
                type: 'unique_prop',
                characterId: char.id,
                text: `Era la única persona sobre ${propName}`,
                predicate: (r, c, b) => b[r][c].prop?.id === propId,
                globalPredicate: (myIdx, pr, pc, b) => {
                   let onProp = 0;
                   for(let j=0; j<N; j++) {
                     if (pr[j]!== -1 && b[pr[j]][pc[j]].prop?.id === propId) onProp++;
                   }
                   return onProp === 1; // exactly me
                },
                score: -1
             });
          }
        }

        // Neighbor props
        const myNeighborsProps: Prop[] = [];
        for (const [dr, dc] of orth) {
          const nr = myR + dr;
          const nc = myC + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
            const nProp = cells[nr][nc].prop;
            if (nProp && nProp.type === 'blocker' && cells[nr][nc].zoneId === myZoneId) {
               myNeighborsProps.push(nProp);
            }
          }
        }

        for (const nProp of myNeighborsProps) {
           cluesForC.push({
              type: 'neighbor',
              characterId: char.id,
              text: `Estaba al lado de ${nProp.name}`,
              predicate: (r, c, b) => isNextToProp(r, c, b, nProp.id),
              score: 1
           });

           cluesForC.push({
              type: 'zone_and_neighbor',
              characterId: char.id,
              text: `Estaba al lado de ${nProp.name} en ${getZoneText(zoneName)}`,
              predicate: (r, c, b) => isNextToProp(r, c, b, nProp.id) && b[r][c].zoneId === myZoneId,
              score: 0
           });

           // Unique Neighbor
           const othersNextToThis = solutionPaths.filter((sol, j) => j !== i && isNextToProp(sol.r, sol.c, cells, nProp.id)).length;
           if (othersNextToThis === 0) {
              cluesForC.push({
                 type: 'unique_neighbor',
                 characterId: char.id,
                 text: `Era la única persona al lado de ${nProp.name}`,
                 predicate: (r, c, b) => isNextToProp(r, c, b, nProp.id),
                 globalPredicate: (myIdx, pr, pc, b) => {
                    let nextTo = 0;
                    for(let j=0; j<N; j++) {
                       if (pr[j] !== -1 && isNextToProp(pr[j], pc[j], b, nProp.id)) nextTo++;
                    }
                    return nextTo === 1;
                 },
                 score: -1
              });
           }
        }

        // Solitary constraints
        if (amISolo) {
           cluesForC.push({
              type: 'solitary',
              characterId: char.id,
              text: `Estaba solo`,
              predicate: () => true,
              globalPredicate: (myIdx, pr, pc, b) => {
                 const myZ = b[pr[myIdx]][pc[myIdx]].zoneId;
                 for(let j=0; j<N; j++) {
                    if (j !== myIdx && pr[j] !== -1 && b[pr[j]][pc[j]].zoneId === myZ) return false;
                 }
                 return true;
              },
              score: 2
           });

           cluesForC.push({
              type: 'solitary_zone',
              characterId: char.id,
              text: `Estaba en ${getZoneText(zoneName)}. Estaba solo.`,
              predicate: (r, c, b) => b[r][c].zoneId === myZoneId,
              globalPredicate: (myIdx, pr, pc, b) => {
                 const myZ = b[pr[myIdx]][pc[myIdx]].zoneId;
                 for(let j=0; j<N; j++) {
                    if (j !== myIdx && pr[j] !== -1 && b[pr[j]][pc[j]].zoneId === myZ) return false;
                 }
                 return true;
              },
              score: 1
           });

           if (myCell.prop && myCell.prop.type === 'valid') {
              cluesForC.push({
                 type: 'solitary_prop',
                 characterId: char.id,
                 text: `Estaba sobre ${myCell.prop.name}. Estaba solo.`,
                 predicate: (r, c, b) => b[r][c].prop?.id === myCell.prop!.id,
                 globalPredicate: (myIdx, pr, pc, b) => {
                    const myZ = b[pr[myIdx]][pc[myIdx]].zoneId;
                    for(let j=0; j<N; j++) {
                       if (j !== myIdx && pr[j] !== -1 && b[pr[j]][pc[j]].zoneId === myZ) return false;
                    }
                    return true;
                 },
                 score: 3
              });
           }

           for (const nProp of myNeighborsProps) {
              cluesForC.push({
                 type: 'solitary_neighbor',
                 characterId: char.id,
                 text: `Estaba al lado de ${nProp.name}. Estaba solo.`,
                 predicate: (r, c, b) => isNextToProp(r, c, b, nProp.id),
                 globalPredicate: (myIdx, pr, pc, b) => {
                    const myZ = b[pr[myIdx]][pc[myIdx]].zoneId;
                    for(let j=0; j<N; j++) {
                       if (j !== myIdx && pr[j] !== -1 && b[pr[j]][pc[j]].zoneId === myZ) return false;
                    }
                    return true;
                 },
                 score: 3
              });
           }
        }

        // With someone else
        if (!amISolo) {
           for (const mate of myZoneMates) {
              const mateCell = cells[solutionPaths[mate].r][solutionPaths[mate].c];
              if (mateCell.prop && mateCell.prop.type === 'valid') {
                 cluesForC.push({
                    type: 'with_prop_user',
                    characterId: char.id,
                    text: `Estaba con alguien que estaba sobre ${mateCell.prop.name}`,
                    predicate: (r, c, b) => {
                       const myZ = b[r][c].zoneId;
                       for(let R=0; R<N; R++) {
                          for(let C=0; C<N; C++) {
                             if(b[R][C].zoneId === myZ && b[R][C].prop?.id === mateCell.prop!.id) return true;
                          }
                       }
                       return false;
                    },
                    globalPredicate: (myIdx, pr, pc, b) => {
                       const myZ = b[pr[myIdx]][pc[myIdx]].zoneId;
                       for(let j=0; j<N; j++) {
                          if (j !== myIdx && pr[j] !== -1 && b[pr[j]][pc[j]].zoneId === myZ) {
                             if (b[pr[j]][pc[j]].prop?.id === mateCell.prop!.id) return true;
                          }
                       }
                       return false;
                    },
                    score: 4
                 });
              }

              const mateNeighborsProps: Prop[] = [];
              for (const [dr, dc] of orth) {
                 const nr = solutionPaths[mate].r + dr;
                 const nc = solutionPaths[mate].c + dc;
                 if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
                    const nProp = cells[nr][nc].prop;
                    if (nProp && nProp.type === 'blocker' && cells[nr][nc].zoneId === myCell.zoneId) {
                       mateNeighborsProps.push(nProp);
                    }
                 }
              }

              for (const nProp of mateNeighborsProps) {
                 cluesForC.push({
                    type: 'with_neighbor_user',
                    characterId: char.id,
                    text: `Estaba con alguien que estaba al lado de ${nProp.name}`,
                    predicate: (r, c, b) => {
                       const myZ = b[r][c].zoneId;
                       for(let R=0; R<N; R++) {
                          for(let C=0; C<N; C++) {
                             if(b[R][C].zoneId === myZ && isNextToProp(R, C, b, nProp.id)) return true;
                          }
                       }
                       return false;
                    },
                    globalPredicate: (myIdx, pr, pc, b) => {
                       const myZ = b[pr[myIdx]][pc[myIdx]].zoneId;
                       for(let j=0; j<N; j++) {
                          if (j !== myIdx && pr[j] !== -1 && b[pr[j]][pc[j]].zoneId === myZ) {
                             if (isNextToProp(pr[j], pc[j], b, nProp.id)) return true;
                          }
                       }
                       return false;
                    },
                    score: 4
                 });
              }
           }
        }
      }
      
      // If we failed to generate any clues for a non-victim, fallback to zone clue (should already be pushed)
      allCluesPerChar.push(cluesForC);
    }

    // 7. Find Unique Solution
    // Backtracking over characters
    function countSolutions(selectedClues: Clue[]): number {
      let count = 0;
      const rowsUsed = new Array(N).fill(false);
      const colsUsed = new Array(N).fill(false);
      const placedRows = new Array(N).fill(-1);
      const placedCols = new Array(N).fill(-1);

      const validCellsForChar: {r: number, c: number, zoneId: number}[][] = [];
      for (let i = 0; i < N; i++) {
        const vCells = [];
        const clue = selectedClues[i];
        for (let r = 0; r < N; r++) {
           for (let c = 0; c < N; c++) {
              if (cells[r][c].prop?.type === 'blocker') continue;
              if (i === 0 || clue.predicate(r, c, cells)) {
                 vCells.push({r, c, zoneId: cells[r][c].zoneId});
              }
           }
        }
        if (vCells.length === 0) return 0;
        validCellsForChar.push(vCells);
      }

      function search(charIdx: number, victimZone: number, inVictimZoneCount: number) {
        if (count > 1) return;
        if (charIdx === N) {
          if (inVictimZoneCount === 1) {
            let ok = true;
            for (let i = 0; i < N; i++) {
               if (selectedClues[i].globalPredicate && !selectedClues[i].globalPredicate!(i, placedRows, placedCols, cells)) {
                  ok = false;
                  break;
               }
            }
            if (ok) count++;
          }
          return;
        }

        const vCells = validCellsForChar[charIdx];
        
        for (let i = 0; i < vCells.length; i++) {
          const {r, c, zoneId} = vCells[i];
          if (rowsUsed[r] || colsUsed[c]) continue;
          
          let nextVictimCount = inVictimZoneCount;
          if (charIdx > 0) {
             if (zoneId === victimZone) {
                if (inVictimZoneCount === 1) continue; // Prune: only 1 killer allowed in victim's zone
                nextVictimCount = 1;
             }
          }

          rowsUsed[r] = true;
          colsUsed[c] = true;
          placedRows[charIdx] = r;
          placedCols[charIdx] = c;
          
          search(charIdx + 1, charIdx === 0 ? zoneId : victimZone, nextVictimCount);
          
          rowsUsed[r] = false;
          colsUsed[c] = false;
          placedRows[charIdx] = -1;
          placedCols[charIdx] = -1;
        }
      }
      search(0, -1, 0);
      return count;
    }

    function getDifficultyScore(selectedClues: Clue[]): number {
      let score = 0;
      for (let i = 1; i < N; i++) {
        const clue = selectedClues[i];
        let validCount = 0;
        for (let r = 0; r < N; r++) {
           for (let c = 0; c < N; c++) {
              if (cells[r][c].prop?.type === 'blocker') continue;
              if (clue.predicate(r, c, cells)) {
                 validCount++;
              }
           }
        }
        score += validCount;
        score += clue.score || 0;
      }
      return score;
    }

    let bestScoreDiff = 999;
    let bestClues = null;

    // Try random clue combinations to find unique solution (now much faster with pruning)
    for (let clueAttempt = 0; clueAttempt < 1500; clueAttempt++) {
      const candidateClues = allCluesPerChar.map(arr => randomItem(arr));

      let numUniquePerson = 0;
      let numSolitary = 0;
      let numWithSomeone = 0;
      let numZoneAndOrNeighbor = 0;
      
      for (const clue of candidateClues) {
        if (clue.type && ['unique_prop', 'unique_neighbor'].includes(clue.type)) numUniquePerson++;
        else if (clue.type && ['solitary', 'solitary_zone', 'solitary_prop', 'solitary_neighbor'].includes(clue.type)) numSolitary++;
        else if (clue.type && ['with_prop_user', 'with_neighbor_user'].includes(clue.type)) numWithSomeone++;
        else if (clue.type && ['zone_and_prop', 'zone_and_neighbor'].includes(clue.type)) numZoneAndOrNeighbor++;
      }
      
      if (numUniquePerson > 1 || numSolitary > 1 || numWithSomeone > 1 || numZoneAndOrNeighbor > 1) {
        continue;
      }

      if (countSolutions(candidateClues) === 1) {
        const score = getDifficultyScore(candidateClues);
        let targetMin = 0, targetMax = 999;
        
        // Tuned bounds
        if (difficulty === 'Muy Fácil') { targetMin = 0; targetMax = 18; }
        else if (difficulty === 'Fácil') { targetMin = 15; targetMax = 25; }
        else if (difficulty === 'Medio') { targetMin = 22; targetMax = 35; }
        else if (difficulty === 'Difícil') { targetMin = 30; targetMax = 45; }
        else if (difficulty === 'Experto') { targetMin = 40; targetMax = 999; }
        
        let diffToTarget = 0;
        if (score < targetMin) diffToTarget = targetMin - score;
        if (score > targetMax) diffToTarget = score - targetMax;
        
        if (diffToTarget === 0) {
           bestClues = candidateClues;
           break; // perfect fit
        } else if (diffToTarget < bestScoreDiff) {
           bestScoreDiff = diffToTarget;
           bestClues = candidateClues;
        }
      }
    }
    
    if (bestClues) {
      const candidateClues = bestClues;

      // Shuffle characters so victim isn't always first in the UI
      const shuffledChars = shuffle(chars.map((c, i) => ({char: c, sol: solutionPaths[i], clueText: candidateClues[i].text})));
      
      return {
        N,
        ambientName: ambient.name,
        zonesInfo,
        cells,
        characters: shuffledChars.map(s => s.char),
        clues: shuffledChars.map(s => ({
          character: s.char,
          text: s.clueText
        })),
        solution: shuffledChars.map(s => s.sol)
      };
    }
  }

  return null;
}
