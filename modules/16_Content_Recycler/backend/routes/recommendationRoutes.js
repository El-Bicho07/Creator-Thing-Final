import express from 'express';
import { getRecommendations, getPostRecommendationDetail } from '../controllers/recommendationsController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticateToken, getRecommendations);
router.get('/post/:id', optionalAuthenticateToken, getPostRecommendationDetail);

export default router;
