import app from './app';
import { config } from './config/config';
import { Database } from './config/database';
import './models'; // carica modelli e relazioni

async function start() {
  try {
    const sequelize = Database.getInstance();
    await sequelize.authenticate(); // verifica la connessione al db
    await sequelize.sync(); // crea le tabelle se non esistono
    app.listen(config.port, () => console.log(`Server avviato sulla porta ${config.port}`));
  } catch (err) {
    console.error('Impossibile avviare il server:', err);
    process.exit(1);
  }
}

start();
