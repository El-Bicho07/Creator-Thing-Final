import express from 'express';
import {
  getPosts,
  getPostById,
  deletePost,
  seedDemoData,
  clearAllPosts,
  getDashboardStats,
} from '../controllers/postsController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticateToken, getPosts);
router.get('/stats', optionalAuthenticateToken, getDashboardStats);
router.post('/seed-demo', seedDemoData);
router.delete('/clear', clearAllPosts);
router.get('/:id', optionalAuthenticateToken, getPostById);
router.delete('/:id', optionalAuthenticateToken, deletePost);

export default router;
