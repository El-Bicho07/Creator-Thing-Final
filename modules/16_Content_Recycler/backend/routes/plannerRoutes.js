import express from 'express';
import {
  getPlanItems,
  createPlanItem,
  updatePlanItem,
  deletePlanItem,
  clearAllPlanItems,
} from '../controllers/plannerController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticateToken, getPlanItems);
router.post('/', optionalAuthenticateToken, createPlanItem);
router.put('/:id', optionalAuthenticateToken, updatePlanItem);
router.delete('/clear', optionalAuthenticateToken, clearAllPlanItems);
router.delete('/:id', optionalAuthenticateToken, deletePlanItem);

export default router;
