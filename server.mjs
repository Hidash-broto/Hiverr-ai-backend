import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectDb } from './utils/db.mjs';
import morgan from 'morgan';
import userRouter from './routers/user.mjs'
import tasksRouter from './routers/tasks.mjs';
import eventRouter from './routers/event.mjs';
import chatRouter from './routers/chatbot.mjs';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/client.mjs';

const app = express();
const port = process.env.PORT;
connectDb();

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

app.use('/api/user', userRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/events', eventRouter);
app.use('/api/chat', chatRouter);
app.use('/api/inngest', serve({ client: inngest, functions }));

app.listen(port, () => console.log(`Port is running on ${port}`));