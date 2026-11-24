import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/config';

/**
 * Genera postman/collection.json e postman/environment.json.
 * I JWT (RS256) sono firmati con la chiave privata del .env e finiscono nell'environment.
 * ATTENZIONE: la variabile dell'URL si chiama  baseUrl  (U maiuscola!) in TUTTE le richieste.
 * Uso:  npm run postman
 */
const sign = (sub: number, email: string, role: string) =>
  jwt.sign({ sub: String(sub), email, role }, config.jwt.privateKey, { algorithm: 'RS256', expiresIn: '365d' });

const env = {
  baseUrl: 'http://localhost:3000',
  tokenAdmin: sign(1, 'admin@example.com', 'admin'),
  tokenMario: sign(2, 'mario@example.com', 'user'),
  tokenLuigi: sign(3, 'luigi@example.com', 'user'),
  tokenEsaurito: sign(4, 'esaurito@example.com', 'user'),
};

type Item = any;

// Crea una richiesta Postman con script di test
function req(
  name: string,
  method: string,
  url: string,
  token: string | null,
  body: any,
  expectedStatus: number,
  extraTests = ''
): Item {
  const header: any[] = [];
  if (token) header.push({ key: 'Authorization', value: `Bearer {{${token}}}` });
  if (body !== null) header.push({ key: 'Content-Type', value: 'application/json' });
  const [p, q] = url.split('?');
  return {
    name,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            `pm.test("Status ${expectedStatus}", function () { pm.response.to.have.status(${expectedStatus}); });`,
            ...extraTests.split('\n').filter(Boolean),
          ],
        },
      },
    ],
    request: {
      method,
      header,
      // le variabili numeriche {{x}} non devono restare tra virgolette, altrimenti il JSON ha una stringa
      body: body !== null ? { mode: 'raw', raw: JSON.stringify(body, null, 2).replace(/"(\{\{\w+\}\})"/g, '$1') } : undefined,
      url: {
        raw: `{{baseUrl}}${url}`,
        host: ['{{baseUrl}}'],
        path: p.split('/').filter(Boolean),
        query: q ? q.split('&').map((kv) => ({ key: kv.split('=')[0], value: kv.split('=')[1] })) : undefined,
      },
    },
  };
}

const js = (code: string) => code;
const folder = (name: string, item: Item[]) => ({ name, item });

const grid3 = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];

const collection = {
  info: {
    name: 'Pathfinding crowd-sourcing',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Eseguire in ordine su un DB appena seedato. Selezionare l\'environment "Pathfinding local".',
  },
  item: [
    folder('1 - Autenticazione', [
      req('Senza token -> 401', 'GET', '/models/1/status', null, null, 401),
      req('Token esauriti (credito 0) -> 401', 'GET', '/models/1/status', 'tokenEsaurito', null, 401),
      req('Token valido -> 200', 'GET', '/models/1/status', 'tokenMario', null, 200,
        js(`pm.test("versione >= 2 e pending presente", function () { const j = pm.response.json(); pm.expect(j.version).to.be.at.least(2); pm.expect(j.hasPendingRequests).to.eql(true); });`)),
    ]),
    folder('2 - Modelli', [
      req('Crea modello (3x3) -> 201', 'POST', '/models', 'tokenMario', { name: 'Modello Postman', grid: grid3 }, 201,
        js(`pm.test("addebito 0.225 token", function () { pm.expect(pm.response.json().charged).to.eql(0.225); });\npm.environment.set("newModelId", pm.response.json().model.id);`)),
      req('Griglia non valida (valore 2) -> 400', 'POST', '/models', 'tokenMario', { name: 'x', grid: [[0, 2]] }, 400),
      req('Nome mancante -> 400', 'POST', '/models', 'tokenMario', { grid: grid3 }, 400),
      req('Esegui modello 1 -> 200', 'POST', '/models/1/execute', 'tokenMario', { start: { x: 0, y: 0 }, goal: { x: 4, y: 4 } }, 200,
        js(`pm.test("percorso, costo e tempo presenti", function () { const j = pm.response.json(); pm.expect(j.found).to.eql(true); pm.expect(j.path.length).to.be.above(1); pm.expect(j.pathCost).to.eql(8); pm.expect(j.executionTimeMs).to.be.a("number"); pm.expect(j.tokensCharged).to.eql(0.625); });`)),
      req('Start su un ostacolo -> 400', 'POST', '/models/1/execute', 'tokenMario', { start: { x: 0, y: 3 }, goal: { x: 4, y: 4 } }, 400),
      req('Goal fuori griglia -> 400', 'POST', '/models/1/execute', 'tokenMario', { start: { x: 0, y: 0 }, goal: { x: 9, y: 9 } }, 400),
      req('Modello inesistente -> 404', 'GET', '/models/999/status', 'tokenMario', null, 404),
    ]),
    folder('3 - Richieste di aggiornamento', [
      req('Proprietario modifica (1,1) -> applicata subito', 'POST', '/models/1/updates', 'tokenMario', { cells: [{ x: 1, y: 1, value: 0 }] }, 201,
        js(`pm.test("ACCEPTED e addebito 0.35", function () { const j = pm.response.json(); pm.expect(j.status).to.eql("ACCEPTED"); pm.expect(j.appliedImmediately).to.eql(true); pm.expect(j.charged).to.eql(0.35); });`)),
      req('Non proprietario (4,3) -> PENDING', 'POST', '/models/1/updates', 'tokenLuigi', { cells: [{ x: 4, y: 3, value: 1 }] }, 201,
        js(`pm.test("PENDING", function () { pm.expect(pm.response.json().status).to.eql("PENDING"); });\npm.environment.set("updateId1", pm.response.json().updates[0].id);`)),
      req('Cella già uguale al valore richiesto -> 400', 'POST', '/models/1/updates', 'tokenLuigi', { cells: [{ x: 0, y: 0, value: 0 }] }, 400),
      req('Cella fuori griglia -> 400', 'POST', '/models/1/updates', 'tokenLuigi', { cells: [{ x: 50, y: 50, value: 1 }] }, 400),
      req('Stato modello: ci sono pending', 'GET', '/models/1/status', 'tokenLuigi', null, 200,
        js(`pm.test("2 pending", function () { pm.expect(pm.response.json().pendingRequests).to.eql(2); });`)),
      req('Pending del proprietario (Mario)', 'GET', '/updates/pending', 'tokenMario', null, 200,
        js(`pm.test("2 richieste pending", function () { pm.expect(pm.response.json().length).to.eql(2); });`)),
      req('Pending di Luigi (nessuna sui suoi modelli)', 'GET', '/updates/pending', 'tokenLuigi', null, 200,
        js(`pm.test("lista vuota", function () { pm.expect(pm.response.json().length).to.eql(0); });`)),
    ]),
    folder('4 - Approvazione / rifiuto', [
      req('Non proprietario prova ad approvare -> 403', 'PATCH', '/models/1/updates/review', 'tokenLuigi', { decisions: [{ updateId: 2, approve: true }] }, 403),
      req('Bulk: approva #2, rifiuta richiesta salvata', 'PATCH', '/models/1/updates/review', 'tokenMario',
        { decisions: [{ updateId: 2, approve: true }, { updateId: '{{updateId1}}', approve: false }] }, 200,
        js(`pm.test("1 accettata e 1 rifiutata", function () { const j = pm.response.json(); pm.expect(j.accepted).to.eql(1); pm.expect(j.rejected).to.eql(1); });`)),
      req('Luigi fa una nuova richiesta (4,0)', 'POST', '/models/1/updates', 'tokenLuigi', { cells: [{ x: 4, y: 0, value: 1 }] }, 201,
        js(`pm.environment.set("updateId2", pm.response.json().updates[0].id);`)),
      req('Rotta singola: approva', 'PATCH', '/updates/{{updateId2}}', 'tokenMario', { approve: true }, 200,
        js(`pm.test("ACCEPTED", function () { pm.expect(pm.response.json().updates[0].status).to.eql("ACCEPTED"); });`)),
      req('Richiesta già gestita -> 400', 'PATCH', '/updates/{{updateId2}}', 'tokenMario', { approve: true }, 400),
      req('Body bulk non valido -> 400', 'PATCH', '/models/1/updates/review', 'tokenMario', { decisions: [] }, 400),
    ]),
    folder('5 - Storico aggiornamenti', [
      req('Storico completo', 'GET', '/models/1/updates', 'tokenMario', null, 200,
        js(`pm.test("accepted e rejected presenti", function () { const j = pm.response.json(); pm.expect(j.accepted.length).to.be.above(0); pm.expect(j.rejected.length).to.be.above(0); });`)),
      req('Filtro intervallo (from + to)', 'GET', '/models/1/updates?from=2020-01-01&to=2100-01-01', 'tokenMario', null, 200,
        js(`pm.test("risultati nell'intervallo", function () { pm.expect(pm.response.json().accepted.length).to.be.above(0); });`)),
      req('Solo from nel futuro -> vuoto', 'GET', '/models/1/updates?from=2100-01-01', 'tokenMario', null, 200,
        js(`pm.test("nessun risultato", function () { const j = pm.response.json(); pm.expect(j.accepted.length + j.rejected.length).to.eql(0); });`)),
      req('Solo to nel passato -> vuoto', 'GET', '/models/1/updates?to=2020-01-01', 'tokenMario', null, 200,
        js(`pm.test("nessun risultato", function () { const j = pm.response.json(); pm.expect(j.accepted.length + j.rejected.length).to.eql(0); });`)),
      req('Data non valida -> 400', 'GET', '/models/1/updates?from=ciao', 'tokenMario', null, 400),
      req('Solo rifiutate', 'GET', '/models/1/updates?status=REJECTED', 'tokenMario', null, 200,
        js(`pm.test("accepted vuoto", function () { pm.expect(pm.response.json().accepted.length).to.eql(0); });`)),
    ]),
    folder('6 - Admin e credito', [
      req('Ricarica da utente normale -> 403', 'POST', '/admin/recharge', 'tokenMario', { email: 'luigi@example.com', credit: 100 }, 403),
      req('Ricarica da admin -> 200', 'POST', '/admin/recharge', 'tokenAdmin', { email: 'esaurito@example.com', credit: 10 }, 200,
        js(`pm.test("nuovo credito 10", function () { pm.expect(pm.response.json().credit).to.eql(10); });`)),
      req('Utente ricaricato ora può usare le API -> 200', 'GET', '/models/1/status', 'tokenEsaurito', null, 200),
      req('Ricarica con email inesistente -> 404', 'POST', '/admin/recharge', 'tokenAdmin', { email: 'nessuno@example.com', credit: 5 }, 404),
      req('Ricarica con body non valido -> 400', 'POST', '/admin/recharge', 'tokenAdmin', { email: 'non-una-mail', credit: -1 }, 400),
      req('Imposta Luigi a 0.1 token', 'POST', '/admin/recharge', 'tokenAdmin', { email: 'luigi@example.com', credit: 0.1 }, 200),
      req('Credito insufficiente per l\'aggiornamento -> 402', 'POST', '/models/1/updates', 'tokenLuigi', { cells: [{ x: 0, y: 4, value: 1 }] }, 402),
      req('Ripristina credito di Luigi', 'POST', '/admin/recharge', 'tokenAdmin', { email: 'luigi@example.com', credit: 300 }, 200),
    ]),
  ],
};

const environment = {
  name: 'Pathfinding local',
  values: Object.entries(env).map(([key, value]) => ({ key, value, type: 'default', enabled: true })),
  _postman_variable_scope: 'environment',
};

const dir = path.join(__dirname, '..', 'postman');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'collection.json'), JSON.stringify(collection, null, 2));
fs.writeFileSync(path.join(dir, 'environment.json'), JSON.stringify(environment, null, 2));
console.log('Creati postman/collection.json e postman/environment.json');
