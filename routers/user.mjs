import express from 'express';
import { login, signup, updateUser, sendForgotPasswordMail, verifyOTP, getUsersFromContacts } from '../controllers/user.mjs';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.put('/:userId', updateUser);
router.post('/send-forgot-password-otp/:email', sendForgotPasswordMail);
router.post('/verify-otp/:email', verifyOTP);
router.get('/contacts', getUsersFromContacts);

export default router;
