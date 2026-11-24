import { Database } from '../config/database';
import { COST_PER_CELL_MODEL, round3 } from '../config/config';
import { ErrorFactory } from '../errors/AppError';
import { modelRepository } from '../repositories/ModelRepository';
import { updateRepository } from '../repositories/UpdateRepository';
import { creditService } from './CreditService';
import { runAStar, Point } from '../utils/pathfinder';
import { HeuristicName } from '../models/GridModel';

export interface CreateModelDto {
  name: string;
  grid: number[][];
  heuristic?: HeuristicName;
  diagonalAllowed?: boolean;
  includeStartNode?: boolean;
  includeEndNode?: boolean;
  weight?: number;
}

// Numero di celle = righe * colonne
export const countCells = (grid: number[][]): number => grid.length * grid[0].length;

export class ModelService {
  /** Crea un modello e addebita 0.025 token per ogni cella della griglia */
  async createModel(userId: number, dto: CreateModelDto) {
    const cost = round3(COST_PER_CELL_MODEL * countCells(dto.grid));
    const sequelize = Database.getInstance();

    return sequelize.transaction(async (t) => {
      const remaining = await creditService.charge(userId, cost, t); // lancia 402 se non basta
      const model = await modelRepository.create({ ...dto, ownerId: userId }, t);
      return { model, charged: cost, remainingCredit: remaining };
    });
  }

  /** Stato di un modello: versione e richieste pending */
  async getStatus(modelId: number) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ErrorFactory.notFound('Modello non trovato');
    const pending = await updateRepository.countPending(modelId);
    return {
      modelId: model.id,
      name: model.name,
      version: model.version,
      hasPendingRequests: pending > 0,
      pendingRequests: pending,
    };
  }

  /** Esegue A* dal punto start al punto goal. Costo in token = come la creazione. */
  async execute(userId: number, modelId: number, start: Point, goal: Point) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ErrorFactory.notFound('Modello non trovato');

    const rows = model.grid.length;
    const cols = model.grid[0].length;
    for (const [nome, p] of [['start', start], ['goal', goal]] as const) {
      if (p.x >= cols || p.y >= rows) {
        throw ErrorFactory.badRequest(`${nome} fuori dalla griglia (${cols} colonne x ${rows} righe)`);
      }
      if (model.grid[p.y][p.x] === 1) {
        throw ErrorFactory.badRequest(`${nome} coincide con un ostacolo`);
      }
    }

    const cost = round3(COST_PER_CELL_MODEL * rows * cols);
    const sequelize = Database.getInstance();
    const remaining = await sequelize.transaction((t) => creditService.charge(userId, cost, t));

    const result = runAStar(
      model.grid,
      {
        heuristic: model.heuristic,
        diagonalAllowed: model.diagonalAllowed,
        includeStartNode: model.includeStartNode,
        includeEndNode: model.includeEndNode,
        weight: model.weight,
      },
      start,
      goal
    );

    return {
      modelId: model.id,
      version: model.version,
      start,
      goal,
      found: result.found,
      path: result.path,
      pathCost: result.cost,
      executionTimeMs: result.executionTimeMs,
      tokensCharged: cost,
      remainingCredit: remaining,
    };
  }
}

export const modelService = new ModelService();
