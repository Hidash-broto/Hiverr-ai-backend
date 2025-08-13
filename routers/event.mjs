import express from 'express'
const router = express.Router();
import {createEvent, getEvents, deleteEvent, updateEvent, eventBulkCreate } from '../controllers/event.mjs';
import { authenticate } from '../middleware/authentication.mjs';

router.get('/', authenticate, getEvents);
router.post('/', authenticate, createEvent);
router.delete('/:id', authenticate, deleteEvent);
router.post('/bulk', authenticate, eventBulkCreate);

router.put('/:id', authenticate, updateEvent);


export default router