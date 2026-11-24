import { Database } from '../config/database';
import '../models';
import { User } from '../models';
import { userRepository } from '../repositories/UserRepository';
import { modelService } from '../services/ModelService';
import { updateService } from '../services/UpdateService';

/**
 * Script di seed: azzera il database e inserisce dati di prova.
 * Lancio:  npm run seed   (con --force: ricrea tutto)
 * Utenti: 1 admin, 2 Mario, 3 Luigi, 4 utente con credito 0.
 * Modelli: 3 modelli, ognuno con almeno 2 versioni (la v1 iniziale + almeno una modifica).
 */
async function seed() {
  const sequelize = Database.getInstance();
  // --force: cancella e ricrea tutto. Senza --force il seed si ferma se il DB è già popolato
  // (così in Docker i dati non vengono azzerati a ogni riavvio).
  const force = process.argv.includes('--force');
  await sequelize.sync({ force });
  if (!force && (await User.count()) > 0) {
    console.log('Database già popolato: seed saltato (usa --force per ricrearlo).');
    await sequelize.close();
    return;
  }

  const admin = await userRepository.create({ email: 'admin@example.com', role: 'admin', credit: 1000 });
  const mario = await userRepository.create({ email: 'mario@example.com', role: 'user', credit: 500 });
  const luigi = await userRepository.create({ email: 'luigi@example.com', role: 'user', credit: 300 });
  await userRepository.create({ email: 'esaurito@example.com', role: 'user', credit: 0 });

  // ---- Modello 1: "Strada Centro" (Mario) 5x5 ----
  const m1 = await modelService.createModel(mario.id, {
    name: 'Strada Centro',
    grid: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 1, 0],
      [1, 1, 0, 1, 0],
      [0, 0, 0, 0, 0],
    ],
  });
  // v2: il proprietario apre il blocco (2,1) -> modifica diretta
  await updateService.requestUpdate(mario.id, m1.model.id, [{ x: 2, y: 1, value: 0 }]);
  // Luigi propone di chiudere (4,1): resta PENDING (da approvare da Mario)
  await updateService.requestUpdate(luigi.id, m1.model.id, [{ x: 4, y: 1, value: 1 }]);

  // ---- Modello 2: "Magazzino" (Luigi) 6x4 con diagonali ----
  const m2 = await modelService.createModel(luigi.id, {
    name: 'Magazzino',
    grid: [
      [0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 1, 0],
      [1, 1, 1, 0, 0, 0],
    ],
    diagonalAllowed: true,
    heuristic: 'Octile',
  });
  await updateService.requestUpdate(luigi.id, m2.model.id, [{ x: 2, y: 0, value: 0 }]); // v2
  await updateService.requestUpdate(luigi.id, m2.model.id, [{ x: 4, y: 1, value: 0 }]); // v3
  // Mario propone una modifica, Luigi la rifiuta (finisce nello storico come REJECTED)
  const r = await updateService.requestUpdate(mario.id, m2.model.id, [{ x: 0, y: 3, value: 0 }]);
  await updateService.review(luigi.id, m2.model.id, [{ updateId: r.updates[0].id, approve: false }]);

  // ---- Modello 3: "Parco" (Mario) 4x4 ----
  const m3 = await modelService.createModel(mario.id, {
    name: 'Parco',
    grid: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    heuristic: 'Euclidean',
  });
  // Luigi propone, Mario approva -> v2
  const r3 = await updateService.requestUpdate(luigi.id, m3.model.id, [{ x: 1, y: 1, value: 0 }]);
  await updateService.review(mario.id, m3.model.id, [{ updateId: r3.updates[0].id, approve: true }]);

  console.log('Seed completato. Utenti:', admin.email, mario.email, luigi.email, 'esaurito@example.com');
  await sequelize.close();
}

seed().catch((e) => {
  console.error('Errore nel seed:', e);
  process.exit(1);
});
