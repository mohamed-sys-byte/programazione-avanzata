import { ErrorFactory } from '../errors/AppError';
import { userRepository } from '../repositories/UserRepository';
import { round3 } from '../config/config';

export class AdminService {
  /** Imposta il nuovo credito di un utente (cercato per email) */
  async recharge(email: string, credit: number) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw ErrorFactory.notFound('Utente non trovato');
    user.credit = round3(credit);
    await user.save();
    return { email: user.email, credit: user.credit };
  }
}

export const adminService = new AdminService();
