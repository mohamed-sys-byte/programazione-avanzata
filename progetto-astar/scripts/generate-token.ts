import jwt from 'jsonwebtoken';
import { config } from '../src/config/config';

/**
 * Genera un JWT RS256 firmato con la chiave privata del .env.
 * Uso:  npm run token -- <id> <email> <role>
 * Es.:  npm run token -- 2 mario@example.com user
 * Il payload contiene SOLO i dati essenziali (sub, email, role).
 */
const [id, email, role] = process.argv.slice(2);
if (!id || !email || !role) {
  console.error('Uso: npm run token -- <id> <email> <user|admin>');
  process.exit(1);
}
const token = jwt.sign({ sub: id, email, role }, config.jwt.privateKey, { algorithm: 'RS256', expiresIn: '365d' });
console.log(token);
