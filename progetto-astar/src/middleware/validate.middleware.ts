import { NextFunction, Request, Response } from 'express';
import { ErrorFactory } from '../errors/AppError';
import { MAX_GRID_SIDE } from '../config/config';

const HEURISTICS = ['Manhattan', 'Euclidean', 'Chebyshev', 'Octile'];

const isInt = (n: any) => typeof n === 'number' && Number.isInteger(n);

/** Controlla che il parametro :id (o altro) sia un intero positivo */
export const validateIdParam = (paramName: string) => (req: Request, _res: Response, next: NextFunction) => {
  const n = Number(req.params[paramName]);
  if (!Number.isInteger(n) || n <= 0) {
    return next(ErrorFactory.badRequest(`Il parametro ${paramName} deve essere un intero positivo`));
  }
  next();
};

/** Controlla la matrice: rettangolare, dimensioni ragionevoli, solo 0 / 1 (funzione pura, testabile) */
export function checkGrid(grid: any): string | null {
  if (!Array.isArray(grid) || grid.length === 0) return 'grid deve essere una matrice non vuota';
  if (!Array.isArray(grid[0]) || grid[0].length === 0) return 'grid deve avere almeno una colonna';
  if (grid.length > MAX_GRID_SIDE || grid[0].length > MAX_GRID_SIDE) {
    return `la griglia può avere al massimo ${MAX_GRID_SIDE} righe e ${MAX_GRID_SIDE} colonne`;
  }
  const cols = grid[0].length;
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== cols) return 'tutte le righe devono avere lo stesso numero di colonne';
    for (const v of row) {
      if (v !== 0 && v !== 1) return 'la griglia può contenere solo i valori 0 e 1';
    }
  }
  return null;
}

/** Validazione POST /models */
export const validateCreateModel = (req: Request, _res: Response, next: NextFunction) => {
  const b = req.body || {};
  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return next(ErrorFactory.badRequest('name è obbligatorio'));
  }
  const gridError = checkGrid(b.grid);
  if (gridError) return next(ErrorFactory.badRequest(gridError));

  if (b.heuristic !== undefined && !HEURISTICS.includes(b.heuristic)) {
    return next(ErrorFactory.badRequest(`heuristic deve essere uno tra: ${HEURISTICS.join(', ')}`));
  }
  for (const f of ['diagonalAllowed', 'includeStartNode', 'includeEndNode']) {
    if (b[f] !== undefined && typeof b[f] !== 'boolean') {
      return next(ErrorFactory.badRequest(`${f} deve essere boolean`));
    }
  }
  if (b.weight !== undefined && (typeof b.weight !== 'number' || b.weight <= 0)) {
    return next(ErrorFactory.badRequest('weight deve essere un numero maggiore di 0'));
  }
  next();
};

/** Validazione POST /models/:id/updates  -> body: { cells: [{x, y, value}] } */
export const validateUpdateRequest = (req: Request, _res: Response, next: NextFunction) => {
  const cells = req.body?.cells;
  if (!Array.isArray(cells) || cells.length === 0) {
    return next(ErrorFactory.badRequest('cells deve essere un array non vuoto'));
  }
  const seen = new Set<string>();
  for (const c of cells) {
    if (!c || !isInt(c.x) || !isInt(c.y) || c.x < 0 || c.y < 0) {
      return next(ErrorFactory.badRequest('ogni cella deve avere x e y interi >= 0'));
    }
    if (c.value !== 0 && c.value !== 1) {
      return next(ErrorFactory.badRequest('value deve essere 0 oppure 1'));
    }
    const key = `${c.x},${c.y}`;
    if (seen.has(key)) return next(ErrorFactory.badRequest(`cella (${key}) duplicata nella richiesta`));
    seen.add(key);
  }
  next();
};

/** Validazione POST /models/:id/execute -> body: { start: {x,y}, goal: {x,y} } */
export const validateExecute = (req: Request, _res: Response, next: NextFunction) => {
  const { start, goal } = req.body || {};
  for (const [nome, p] of [['start', start], ['goal', goal]] as const) {
    if (!p || !isInt(p.x) || !isInt(p.y) || p.x < 0 || p.y < 0) {
      return next(ErrorFactory.badRequest(`${nome} deve essere un oggetto {x, y} con interi >= 0`));
    }
  }
  next();
};

/** Validazione PATCH /updates/:updateId -> body: { approve: boolean } */
export const validateSingleReview = (req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body?.approve !== 'boolean') {
    return next(ErrorFactory.badRequest('approve deve essere true oppure false'));
  }
  next();
};

/** Validazione PATCH /models/:id/updates/review -> body: { decisions: [{updateId, approve}] } */
export const validateBulkReview = (req: Request, _res: Response, next: NextFunction) => {
  const d = req.body?.decisions;
  if (!Array.isArray(d) || d.length === 0) {
    return next(ErrorFactory.badRequest('decisions deve essere un array non vuoto'));
  }
  const ids = new Set<number>();
  for (const x of d) {
    if (!x || !isInt(x.updateId) || x.updateId <= 0 || typeof x.approve !== 'boolean') {
      return next(ErrorFactory.badRequest('ogni decisione deve avere updateId (intero) e approve (boolean)'));
    }
    if (ids.has(x.updateId)) return next(ErrorFactory.badRequest(`updateId ${x.updateId} duplicato`));
    ids.add(x.updateId);
  }
  next();
};

/** Validazione query GET /models/:id/updates?from=&to=&status= */
export const validateHistoryQuery = (req: Request, _res: Response, next: NextFunction) => {
  const { from, to, status } = req.query;
  let fromD: Date | undefined;
  let toD: Date | undefined;

  if (from !== undefined) {
    fromD = new Date(String(from));
    if (isNaN(fromD.getTime())) return next(ErrorFactory.badRequest('from non è una data valida (formato ISO)'));
  }
  if (to !== undefined) {
    toD = new Date(String(to));
    if (isNaN(toD.getTime())) return next(ErrorFactory.badRequest('to non è una data valida (formato ISO)'));
  }
  if (fromD && toD && fromD > toD) {
    return next(ErrorFactory.badRequest('from non può essere successiva a to'));
  }
  if (status !== undefined && !['ACCEPTED', 'REJECTED'].includes(String(status).toUpperCase())) {
    return next(ErrorFactory.badRequest('status deve essere ACCEPTED oppure REJECTED'));
  }
  next();
};

/** Validazione POST /admin/recharge -> body: { email, credit } */
export const validateRecharge = (req: Request, _res: Response, next: NextFunction) => {
  const { email, credit } = req.body || {};
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return next(ErrorFactory.badRequest('email non valida'));
  }
  if (typeof credit !== 'number' || !isFinite(credit) || credit < 0) {
    return next(ErrorFactory.badRequest('credit deve essere un numero >= 0'));
  }
  next();
};
