import express from 'express';
import { getSimilarityAnalysis, findSimilarToPost } from '../controllers/similarityController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticateToken, getSimilarityAnalysis);
router.get('/post/:id', optionalAuthenticateToken, findSimilarToPost);

export default router;
