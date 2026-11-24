import { Database } from '../config/database';
import { COST_PER_CELL_UPDATE, round3 } from '../config/config';
import { ErrorFactory } from '../errors/AppError';
import { modelRepository } from '../repositories/ModelRepository';
import { updateRepository } from '../repositories/UpdateRepository';
import { creditService } from './CreditService';
import { UpdateStatus } from '../models/GridUpdate';

export interface CellChange {
  x: number;
  y: number;
  value: number;
}

export interface Decision {
  updateId: number;
  approve: boolean;
}

export class UpdateService {
  /**
   * Richiesta di aggiornamento di una o più celle.
   *  - se chi chiede è il proprietario -> la modifica è applicata subito
   *  - altrimenti -> la richiesta resta PENDING finché il proprietario decide
   * In entrambi i casi si paga 0.35 token per cella.
   */
  async requestUpdate(userId: number, modelId: number, cells: CellChange[]) {
    const sequelize = Database.getInstance();

    return sequelize.transaction(async (t) => {
      const model = await modelRepository.findById(modelId, t, true);
      if (!model) throw ErrorFactory.notFound('Modello non trovato');

      const rows = model.grid.length;
      const cols = model.grid[0].length;
      for (const c of cells) {
        if (c.x >= cols || c.y >= rows) {
          throw ErrorFactory.badRequest(`Cella (${c.x},${c.y}) fuori dalla griglia`);
        }
        // l'aggiornamento deve cambiare davvero il valore (0->1 oppure 1->0)
        if (model.grid[c.y][c.x] === c.value) {
          throw ErrorFactory.badRequest(`La cella (${c.x},${c.y}) vale già ${c.value}`);
        }
      }

      const cost = round3(COST_PER_CELL_UPDATE * cells.length);
      const remaining = await creditService.charge(userId, cost, t);

      const isOwner = model.ownerId === userId;
      const status: UpdateStatus = isOwner ? 'ACCEPTED' : 'PENDING';
      let newVersion: number | null = null;

      if (isOwner) {
        // copio la griglia (così Sequelize si accorge che è cambiata) e applico le modifiche
        const newGrid = model.grid.map((r) => [...r]);
        cells.forEach((c) => (newGrid[c.y][c.x] = c.value));
        model.grid = newGrid;
        model.version = model.version + 1;
        newVersion = model.version;
        await model.save({ transaction: t });
      }

      const created = await updateRepository.bulkCreate(
        cells.map((c) => ({
          modelId,
          requesterId: userId,
          x: c.x,
          y: c.y,
          newValue: c.value,
          status,
          cost: round3(COST_PER_CELL_UPDATE),
          appliedVersion: newVersion,
          resolvedAt: isOwner ? new Date() : null,
        })),
        t
      );

      return {
        status,
        appliedImmediately: isOwner,
        modelVersion: model.version,
        charged: cost,
        remainingCredit: remaining,
        updates: created,
      };
    });
  }

  /**
   * Approva / rifiuta una o più richieste pending (bulk). Solo il proprietario del modello.
   * Anche la rotta "singola" usa questo metodo passando una sola decisione.
   */
  async review(userId: number, modelId: number, decisions: Decision[]) {
    const sequelize = Database.getInstance();

    return sequelize.transaction(async (t) => {
      const model = await modelRepository.findById(modelId, t, true);
      if (!model) throw ErrorFactory.notFound('Modello non trovato');
      if (model.ownerId !== userId) {
        throw ErrorFactory.forbidden('Solo il proprietario del modello può approvare o rifiutare');
      }

      const ids = decisions.map((d) => d.updateId);
      const updates = await updateRepository.findByIdsOfModel(ids, modelId, t);
      if (updates.length !== new Set(ids).size) {
        throw ErrorFactory.notFound('Una o più richieste non esistono per questo modello');
      }
      if (updates.some((u) => u.status !== 'PENDING')) {
        throw ErrorFactory.badRequest('Una o più richieste non sono più in stato PENDING');
      }

      const approvedIds = new Set(decisions.filter((d) => d.approve).map((d) => d.updateId));
      const newGrid = model.grid.map((r) => [...r]);
      if (approvedIds.size > 0) {
        updates.filter((u) => approvedIds.has(u.id)).forEach((u) => (newGrid[u.y][u.x] = u.newValue));
        model.grid = newGrid;
        model.version = model.version + 1; // una sola nuova versione per tutto il blocco approvato
        await model.save({ transaction: t });
      }

      for (const u of updates) {
        const approved = approvedIds.has(u.id);
        u.status = approved ? 'ACCEPTED' : 'REJECTED';
        u.resolvedAt = new Date();
        u.appliedVersion = approved ? model.version : null;
        await u.save({ transaction: t });
      }

      return {
        modelId,
        modelVersion: model.version,
        accepted: updates.filter((u) => u.status === 'ACCEPTED').length,
        rejected: updates.filter((u) => u.status === 'REJECTED').length,
        updates,
      };
    });
  }

  /** Rotta "singola": trova il modello della richiesta e chiama review */
  async reviewSingle(userId: number, updateId: number, approve: boolean) {
    const update = await updateRepository.findById(updateId);
    if (!update) throw ErrorFactory.notFound('Richiesta di aggiornamento non trovata');
    return this.review(userId, update.modelId, [{ updateId, approve }]);
  }

  /** Storico degli aggiornamenti accettati / rifiutati, con filtri opzionali sulla data */
  async history(modelId: number, from?: Date, to?: Date, status?: 'ACCEPTED' | 'REJECTED') {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ErrorFactory.notFound('Modello non trovato');

    const statuses: UpdateStatus[] = status ? [status] : ['ACCEPTED', 'REJECTED'];
    const rows = await updateRepository.findHistory(modelId, statuses, from, to);

    return {
      modelId,
      accepted: rows.filter((r) => r.status === 'ACCEPTED'),
      rejected: rows.filter((r) => r.status === 'REJECTED'),
    };
  }

  /** Tutte le richieste pending sui modelli creati dall'utente autenticato */
  async pendingForOwner(userId: number) {
    return updateRepository.findPendingForOwner(userId);
  }
}

export const updateService = new UpdateService();
