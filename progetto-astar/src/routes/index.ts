import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import {
  validateBulkReview,
  validateCreateModel,
  validateExecute,
  validateHistoryQuery,
  validateIdParam,
  validateRecharge,
  validateSingleReview,
  validateUpdateRequest,
} from '../middleware/validate.middleware';
import { modelController as m } from '../controllers/ModelController';
import { adminController as a } from '../controllers/AdminController';

const router = Router();

// TUTTE le rotte richiedono il JWT: applico authenticate a tutto il router
router.use(authenticate);

// --- Modelli ---
router.post('/models', validateCreateModel, (req, res) => m.create(req, res));
router.get('/models/:id/status', validateIdParam('id'), (req, res) => m.status(req, res));
router.post('/models/:id/execute', validateIdParam('id'), validateExecute, (req, res) => m.execute(req, res));

// --- Aggiornamenti ---
router.post('/models/:id/updates', validateIdParam('id'), validateUpdateRequest, (req, res) => m.requestUpdate(req, res));
router.get('/models/:id/updates', validateIdParam('id'), validateHistoryQuery, (req, res) => m.history(req, res));
// NB: "pending" e "review" sono rotte fisse, le metto prima di quelle con parametro
router.get('/updates/pending', (req, res) => m.pending(req, res));
router.patch('/models/:id/updates/review', validateIdParam('id'), validateBulkReview, (req, res) => m.reviewBulk(req, res));
router.patch('/updates/:updateId', validateIdParam('updateId'), validateSingleReview, (req, res) => m.reviewSingle(req, res));

// --- Admin ---
router.post('/admin/recharge', isAdmin, validateRecharge, (req, res) => a.recharge(req, res));

export default router;
