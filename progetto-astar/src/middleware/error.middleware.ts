import { NextFunction, Request, Response } from 'express';
import { AppError, ErrorFactory } from '../errors/AppError';

/** Middleware per le rotte inesistenti (404) */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(ErrorFactory.notFound(`Rotta ${req.method} ${req.originalUrl} non trovata`));
};

/**
 * Middleware finale per gli errori: tutti gli errori lanciati (o passati con next(err))
 * arrivano qui e vengono trasformati in una risposta JSON uniforme.
 */
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // 1) errori nostri
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  // 2) JSON nel body scritto male (lo segnala body-parser di express)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'JSON del body non valido' });
  }
  // 3) tutto il resto: errore imprevisto -> 500 (non mostro i dettagli al client)
  console.error(err);
  const e = ErrorFactory.internal();
  return res.status(e.statusCode).json({ error: e.message });
};
