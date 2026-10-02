import express from 'express';
import multer from 'multer';
import { previewCSV, commitImport, downloadSampleCSV } from '../controllers/importController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.post('/preview', upload.single('file'), previewCSV);
router.post('/commit', optionalAuthenticateToken, commitImport);
router.get('/sample', downloadSampleCSV);

export default router;
