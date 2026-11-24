import { AStarFinder } from 'astar-typescript';

export interface Point {
  x: number;
  y: number;
}

export interface PathfinderOptions {
  heuristic: 'Manhattan' | 'Euclidean' | 'Chebyshev' | 'Octile';
  diagonalAllowed: boolean;
  includeStartNode: boolean;
  includeEndNode: boolean;
  weight: number;
}

export interface PathResult {
  found: boolean;
  path: number[][]; // lista di coppie [x, y]
  cost: number; // costo del percorso sul grafo (NON sono i token)
  executionTimeMs: number;
}

/**
 * Calcola il costo di un percorso sommando il costo di ogni passo:
 *  - passo in orizzontale/verticale = 1
 *  - passo in diagonale = radice di 2 (circa 1.414)
 */
export function computePathCost(path: number[][]): number {
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = Math.abs(path[i][0] - path[i - 1][0]);
    const dy = Math.abs(path[i][1] - path[i - 1][1]);
    cost += dx + dy === 2 ? Math.SQRT2 : 1;
  }
  return Math.round(cost * 1000) / 1000;
}

/**
 * Esegue l'algoritmo A* (libreria astar-typescript) sulla griglia.
 * In astar-typescript: 0 = cella libera, 1 = ostacolo; le posizioni sono {x: colonna, y: riga}.
 */
export function runAStar(grid: number[][], opts: PathfinderOptions, start: Point, goal: Point): PathResult {
  const t0 = process.hrtime.bigint(); // misuro il tempo di esecuzione

  const finder = new AStarFinder({
    // faccio una copia della matrice per essere sicuro di non modificare quella del modello
    grid: { matrix: grid.map((row) => [...row]) },
    diagonalAllowed: opts.diagonalAllowed,
    heuristic: opts.heuristic,
    includeStartNode: opts.includeStartNode,
    includeEndNode: opts.includeEndNode,
    weight: opts.weight,
  });
  const path = finder.findPath(start, goal);

  const t1 = process.hrtime.bigint();
  const executionTimeMs = Number(t1 - t0) / 1e6;

  return {
    found: path.length > 0,
    path,
    cost: computePathCost(path),
    executionTimeMs: Math.round(executionTimeMs * 1000) / 1000,
  };
}
