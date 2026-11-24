import { Sequelize } from 'sequelize';
import { config } from './config';

/**
 * PATTERN SINGLETON
 * Voglio una sola connessione (un solo oggetto Sequelize) in tutta l'applicazione.
 * getInstance() crea l'oggetto la prima volta e poi restituisce sempre lo stesso.
 */
export class Database {
  private static instance: Sequelize;

  // costruttore privato: nessuno può fare "new Database()"
  private constructor() {}

  public static getInstance(): Sequelize {
    if (!Database.instance) {
      Database.instance = new Sequelize(config.db.name, config.db.user, config.db.password, {
        host: config.db.host,
        port: config.db.port,
        dialect: 'postgres',
        logging: false,
      });
    }
    return Database.instance;
  }
}
