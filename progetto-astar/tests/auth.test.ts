import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';

// Sostituisco il repository con un finto: il test non usa il database
jest.mock('../src/repositories/UserRepository', () => ({
  userRepository: { findById: jest.fn() },
}));

import { userRepository } from '../src/repositories/UserRepository';
import { authenticate, isAdmin } from '../src/middleware/auth.middleware';

const findById = userRepository.findById as jest.Mock;

// Crea un token firmato con la chiave privata dei test (stessa del setup)
const makeToken = (sub = '2', role = 'user') =>
  jwt.sign({ sub, email: 'x@example.com', role }, process.env.JWT_PRIVATE_KEY!, { algorithm: 'RS256' });

const run = async (authorization?: string) => {
  const req: any = { headers: authorization ? { authorization } : {} };
  const next = jest.fn();
  await authenticate(req, {} as any, next);
  return { req, err: next.mock.calls[0][0] };
};

describe('Middleware di autenticazione', () => {
  beforeEach(() => findById.mockReset());

  it('401 se manca il token', async () => {
    const { err } = await run();
    expect(err.statusCode).toBe(401);
  });

  it('401 se il token è firmato con una chiave sbagliata', async () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const bad = jwt.sign({ sub: '2' }, other.privateKey.export({ type: 'pkcs8', format: 'pem' }), { algorithm: 'RS256' });
    const { err } = await run(`Bearer ${bad}`);
    expect(err.statusCode).toBe(401);
  });

  it('401 se i token (credito) sono terminati', async () => {
    findById.mockResolvedValue({ id: 2, email: 'x@example.com', role: 'user', credit: 0 });
    const { err } = await run(`Bearer ${makeToken()}`);
    expect(err.statusCode).toBe(401);
  });

  it('passa se il token è valido e c\'è credito', async () => {
    findById.mockResolvedValue({ id: 2, email: 'x@example.com', role: 'user', credit: 5 });
    const { req, err } = await run(`Bearer ${makeToken()}`);
    expect(err).toBeUndefined();
    expect(req.user).toEqual({ id: 2, email: 'x@example.com', role: 'user' });
  });

  it('isAdmin: 403 per un utente normale', () => {
    const next = jest.fn();
    isAdmin({ user: { role: 'user' } } as any, {} as any, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
