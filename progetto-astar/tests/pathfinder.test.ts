import { computePathCost, runAStar } from '../src/utils/pathfinder';

const opts = {
  heuristic: 'Manhattan' as const,
  diagonalAllowed: false,
  includeStartNode: true,
  includeEndNode: true,
  weight: 1,
};

describe('Pathfinder (A*)', () => {
  it('trova il percorso più breve su una griglia libera', () => {
    const grid = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const r = runAStar(grid, opts, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(r.found).toBe(true);
    expect(r.path[0]).toEqual([0, 0]); // parte dallo start
    expect(r.path[r.path.length - 1]).toEqual([2, 2]); // arriva al goal
    expect(r.cost).toBe(4); // 4 passi ortogonali
    expect(r.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('non trova il percorso se il goal è circondato da ostacoli', () => {
    const grid = [
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ];
    const r = runAStar(grid, opts, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(r.found).toBe(false);
    expect(r.path).toEqual([]);
  });

  it('il costo di un passo in diagonale è radice di 2', () => {
    expect(computePathCost([[0, 0], [1, 1]])).toBeCloseTo(1.414, 3);
  });
});
