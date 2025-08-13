import express from 'express';

const router = express.Router();


router.post('/chat', chatbotHandler);

export default router;