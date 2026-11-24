import { checkGrid, validateUpdateRequest } from '../src/middleware/validate.middleware';
import { AppError } from '../src/errors/AppError';

describe('Validazione', () => {
  it('accetta una griglia valida', () => {
    expect(checkGrid([[0, 1], [1, 0]])).toBeNull();
  });

  it('rifiuta griglie non valide', () => {
    expect(checkGrid([])).not.toBeNull(); // vuota
    expect(checkGrid([[0, 1], [1]])).not.toBeNull(); // righe di lunghezza diversa
    expect(checkGrid([[0, 2]])).not.toBeNull(); // valore diverso da 0/1
    expect(checkGrid('ciao')).not.toBeNull(); // non è una matrice
  });

  it('rifiuta celle duplicate in una richiesta di aggiornamento', () => {
    const next = jest.fn();
    const req: any = { body: { cells: [{ x: 0, y: 0, value: 1 }, { x: 0, y: 0, value: 1 }] } };
    validateUpdateRequest(req, {} as any, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
  });
});
