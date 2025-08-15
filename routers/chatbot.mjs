import express from 'express';
import { chatbotHandler, initialChatMessage } from '../controllers/chatbot.mjs';
import { authenticate } from '../middleware/authentication.mjs';

const router = express.Router();

router.post('/', authenticate, chatbotHandler);
router.get('/initial-message', authenticate, initialChatMessage);

export default router;