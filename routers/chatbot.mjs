import express from 'express';
import { chatbotHandler, initialChatMessage, voiceToTextConverter } from '../controllers/chatbot.mjs';
import { authenticate } from '../middleware/authentication.mjs';
import upload from '../middleware/multer.mjs';

const router = express.Router();

router.post('/', authenticate, chatbotHandler);
router.post('/voice-to-text', authenticate, upload.single('audio'), voiceToTextConverter);
router.get('/initial-message', authenticate, initialChatMessage);

export default router;