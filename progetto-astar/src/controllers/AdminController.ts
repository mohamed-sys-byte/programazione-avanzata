import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { adminService } from '../services/AdminService';

export class AdminController {
  // POST /admin/recharge
  async recharge(req: AuthRequest, res: Response) {
    res.json(await adminService.recharge(req.body.email, req.body.credit));
  }
}

export const adminController = new AdminController();
