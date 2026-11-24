/**
 * Errore personalizzato dell'applicazione: oltre al messaggio ha lo status HTTP.
 * Il middleware degli errori userà statusCode per rispondere al client.
 */
export class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * PATTERN FACTORY
 * Invece di scrivere ovunque "new AppError(404, ...)", uso dei metodi statici
 * che creano l'errore giusto. Il codice resta più leggibile e uniforme.
 */
export class ErrorFactory {
  static badRequest(msg = 'Richiesta non valida'): AppError {
    return new AppError(400, msg);
  }
  static unauthorized(msg = 'Non autorizzato'): AppError {
    return new AppError(401, msg);
  }
  static paymentRequired(msg = 'Credito insufficiente'): AppError {
    return new AppError(402, msg);
  }
  static forbidden(msg = 'Operazione non consentita'): AppError {
    return new AppError(403, msg);
  }
  static notFound(msg = 'Risorsa non trovata'): AppError {
    return new AppError(404, msg);
  }
  static internal(msg = 'Errore interno del server'): AppError {
    return new AppError(500, msg);
  }
}
