import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { modelService } from '../services/ModelService';
import { updateService } from '../services/UpdateService';

/**
 * I controller sono "sottili": leggono i dati dalla request, chiamano il service
 * e rispondono. Gli errori (anche async) li gestisce Express 5 passandoli al middleware errori.
 */
export class ModelController {
  // POST /models
  async create(req: AuthRequest, res: Response) {
    const { name, grid, heuristic, diagonalAllowed, includeStartNode, includeEndNode, weight } = req.body;
    const result = await modelService.createModel(req.user!.id, {
      name: name.trim(),
      grid,
      heuristic,
      diagonalAllowed,
      includeStartNode,
      includeEndNode,
      weight,
    });
    res.status(201).json(result);
  }

  // GET /models/:id/status
  async status(req: AuthRequest, res: Response) {
    res.json(await modelService.getStatus(Number(req.params.id)));
  }

  // POST /models/:id/execute
  async execute(req: AuthRequest, res: Response) {
    const { start, goal } = req.body;
    res.json(await modelService.execute(req.user!.id, Number(req.params.id), start, goal));
  }

  // POST /models/:id/updates
  async requestUpdate(req: AuthRequest, res: Response) {
    const result = await updateService.requestUpdate(req.user!.id, Number(req.params.id), req.body.cells);
    res.status(201).json(result);
  }

  // GET /models/:id/updates?from=&to=&status=
  async history(req: AuthRequest, res: Response) {
    const { from, to, status } = req.query;
    const result = await updateService.history(
      Number(req.params.id),
      from ? new Date(String(from)) : undefined,
      to ? new Date(String(to)) : undefined,
      status ? (String(status).toUpperCase() as 'ACCEPTED' | 'REJECTED') : undefined
    );
    res.json(result);
  }

  // PATCH /models/:id/updates/review  (bulk)
  async reviewBulk(req: AuthRequest, res: Response) {
    res.json(await updateService.review(req.user!.id, Number(req.params.id), req.body.decisions));
  }

  // PATCH /updates/:updateId  (singola)
  async reviewSingle(req: AuthRequest, res: Response) {
    res.json(await updateService.reviewSingle(req.user!.id, Number(req.params.updateId), req.body.approve));
  }

  // GET /updates/pending
  async pending(req: AuthRequest, res: Response) {
    res.json(await updateService.pendingForOwner(req.user!.id));
  }
}

export const modelController = new ModelController();
