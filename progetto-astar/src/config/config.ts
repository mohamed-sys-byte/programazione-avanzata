import dotenv from 'dotenv';

// Carico le variabili dal file .env (se esiste). Non sovrascrive quelle già presenti.
dotenv.config({ quiet: true });

// Le chiavi nel .env sono su una riga sola con i "\n" scritti come testo:
// qui li trasformo in veri a-capo, altrimenti jsonwebtoken non legge la chiave.
const fixKey = (k?: string) => (k ? k.replace(/\\n/g, '\n') : '');

export const config = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'astar_db',
    user: process.env.DB_USER || 'astar_user',
    password: process.env.DB_PASSWORD || 'astar_pass',
  },
  jwt: {
    privateKey: fixKey(process.env.JWT_PRIVATE_KEY),
    publicKey: fixKey(process.env.JWT_PUBLIC_KEY),
  },
};

// Costi richiesti dalla traccia dell'esame
export const COST_PER_CELL_MODEL = 0.025; // creazione ed esecuzione di un modello (per cella)
export const COST_PER_CELL_UPDATE = 0.35; // richiesta di aggiornamento (per cella)
export const MAX_GRID_SIDE = 100; // lato massimo della griglia (validazione)

// Arrotonda a 3 decimali per evitare errori tipo 0.1+0.2=0.30000000000000004
export const round3 = (n: number): number => Math.round(n * 1000) / 1000;
