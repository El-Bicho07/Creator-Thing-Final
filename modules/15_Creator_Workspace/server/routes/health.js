import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'CreatorSpace AI Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
