import { Transaction } from 'sequelize';
import { ErrorFactory } from '../errors/AppError';
import { userRepository } from '../repositories/UserRepository';
import { round3 } from '../config/config';

/**
 * Gestisce il credito (token) degli utenti.
 * Deve essere chiamato dentro una transazione, così se qualcosa va storto dopo
 * l'addebito, Sequelize fa il rollback e l'utente non perde token.
 */
export class CreditService {
  async charge(userId: number, amount: number, t: Transaction): Promise<number> {
    const user = await userRepository.findById(userId, t, true); // riga bloccata
    if (!user) throw ErrorFactory.notFound('Utente non trovato');

    const price = round3(amount);
    if (user.credit < price) {
      throw ErrorFactory.paymentRequired(`Credito insufficiente: servono ${price} token, ne hai ${user.credit}`);
    }
    user.credit = round3(user.credit - price);
    await user.save({ transaction: t });
    return user.credit;
  }
}

export const creditService = new CreditService();
