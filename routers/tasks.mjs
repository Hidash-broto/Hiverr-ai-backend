import express from 'express';
import { getTasks, createTask, bulkCreateTasks, updateTask, deleteTask, getTaskById } from '../controllers/tasks.mjs';
import { authenticate } from '../middleware/authentication.mjs';

const router = express.Router();

router.get('/', authenticate, getTasks);
router.post('/bulk', authenticate, bulkCreateTasks);
router.post('/', authenticate, createTask);
router.put('/:taskId', authenticate, updateTask);
router.delete('/:taskId', authenticate, deleteTask);
router.get('/:taskId', authenticate, getTaskById);

export default router;