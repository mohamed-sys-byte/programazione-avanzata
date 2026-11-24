import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { ErrorFactory } from '../errors/AppError';
import { userRepository } from '../repositories/UserRepository';

// Dati dell'utente che mettiamo dentro req.user dopo l'autenticazione
export interface AuthUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
}
export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware di autenticazione JWT (RS256).
 * 1. legge l'header "Authorization: Bearer <token>"
 * 2. verifica la firma con la chiave PUBBLICA (presa dal .env)
 * 3. legge l'utente dal db e controlla che abbia ancora token (credito > 0)
 * Il payload del JWT contiene solo: sub (id), email, role.
 */
export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ErrorFactory.unauthorized('Token JWT mancante');
    }
    const token = header.substring(7);

    let payload: jwt.JwtPayload;
    try {
      // algorithms: ['RS256'] impedisce di accettare token firmati con altri algoritmi
      payload = jwt.verify(token, config.jwt.publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
    } catch {
      throw ErrorFactory.unauthorized('Token JWT non valido o scaduto');
    }

    const userId = Number(payload.sub);
    if (!userId) throw ErrorFactory.unauthorized('Token JWT senza identificativo utente');

    const user = await userRepository.findById(userId);
    if (!user) throw ErrorFactory.unauthorized('Utente non trovato');

    // Token (credito) terminati -> 401. L'admin è escluso, altrimenti non potrebbe ricaricare nessuno.
    if (user.role !== 'admin' && user.credit <= 0) {
      throw ErrorFactory.unauthorized('Token terminati: contatta un amministratore per la ricarica');
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err); // passo l'errore al middleware degli errori
  }
};

/** Middleware di autorizzazione: lascia passare solo gli admin */
export const isAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return next(ErrorFactory.forbidden('Serve il ruolo admin'));
  }
  next();
};
