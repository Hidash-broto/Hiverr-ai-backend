import express from 'express';
import { dashboardData } from '../controllers/dashboard.mjs';
import { authenticate } from '../middleware/authentication.mjs';

const router = express.Router();

router.get('/', authenticate, dashboardData);

export default router;
