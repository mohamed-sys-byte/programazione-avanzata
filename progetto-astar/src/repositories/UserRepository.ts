import { Transaction } from 'sequelize';
import { User } from '../models';

/**
 * PATTERN REPOSITORY
 * Qui metto tutte le query sulla tabella users. I service non usano Sequelize
 * direttamente: così se cambio database o query modifico solo questo file.
 */
export class UserRepository {
  async findById(id: number, t?: Transaction, lock = false): Promise<User | null> {
    // lock = true -> "SELECT ... FOR UPDATE": blocca la riga finché la transazione non finisce,
    // così due richieste insieme non possono spendere lo stesso credito.
    return User.findByPk(id, { transaction: t, lock: lock && t ? t.LOCK.UPDATE : undefined });
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async create(data: { email: string; role: 'user' | 'admin'; credit: number }): Promise<User> {
    return User.create(data);
  }
}

export const userRepository = new UserRepository();
