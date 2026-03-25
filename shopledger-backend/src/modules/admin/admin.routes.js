import { Router } from 'express';
import {
  listShops,
  getShop,
  approveShop,
  suspendShop,
  getStats,
} from './admin.controller.js';

const router = Router();

router.get('/stats',              getStats);
router.get('/shops',              listShops);
router.get('/shops/:id',          getShop);
router.patch('/shops/:id/approve', approveShop);
router.patch('/shops/:id/suspend', suspendShop);

export default router;
