import { Transaction } from 'sequelize';
import { GridModel } from '../models';

// Repository per la tabella models
export class ModelRepository {
  async create(data: any, t?: Transaction): Promise<GridModel> {
    return GridModel.create(data, { transaction: t });
  }

  async findById(id: number, t?: Transaction, lock = false): Promise<GridModel | null> {
    return GridModel.findByPk(id, { transaction: t, lock: lock && t ? t.LOCK.UPDATE : undefined });
  }
}

export const modelRepository = new ModelRepository();
