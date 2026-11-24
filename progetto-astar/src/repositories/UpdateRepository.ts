import { Op, Transaction, WhereOptions } from 'sequelize';
import { GridModel, GridUpdate } from '../models';
import { UpdateStatus } from '../models/GridUpdate';

// Repository per la tabella grid_updates
export class UpdateRepository {
  async bulkCreate(rows: any[], t?: Transaction): Promise<GridUpdate[]> {
    return GridUpdate.bulkCreate(rows, { transaction: t });
  }

  async findById(id: number): Promise<GridUpdate | null> {
    return GridUpdate.findByPk(id);
  }

  async findByIdsOfModel(ids: number[], modelId: number, t?: Transaction): Promise<GridUpdate[]> {
    return GridUpdate.findAll({ where: { id: { [Op.in]: ids }, modelId }, transaction: t });
  }

  async countPending(modelId: number): Promise<number> {
    return GridUpdate.count({ where: { modelId, status: 'PENDING' } });
  }

  // Storico di un modello con filtri opzionali sulla data (da / a) e sullo stato
  async findHistory(modelId: number, statuses: UpdateStatus[], from?: Date, to?: Date): Promise<GridUpdate[]> {
    const where: WhereOptions = { modelId, status: { [Op.in]: statuses } };
    if (from && to) {
      (where as any).createdAt = { [Op.between]: [from, to] };
    } else if (from) {
      (where as any).createdAt = { [Op.gte]: from };
    } else if (to) {
      (where as any).createdAt = { [Op.lte]: to };
    }
    return GridUpdate.findAll({ where, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  }

  // Richieste pending relative ai modelli creati da ownerId (JOIN con la tabella models)
  async findPendingForOwner(ownerId: number): Promise<GridUpdate[]> {
    return GridUpdate.findAll({
      where: { status: 'PENDING' },
      include: [{ model: GridModel, as: 'model', where: { ownerId }, attributes: ['id', 'name'] }],
      order: [['id', 'ASC']],
    });
  }
}

export const updateRepository = new UpdateRepository();
