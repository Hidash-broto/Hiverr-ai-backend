import Chat from '../models/Chat.mjs';
import { agent, app, initializeChat, llmChat } from '../utils/chat.mjs';
import Event from '../models/event.mjs';
import Task from '../models/Tasks.mjs';
import { v4 as uuid } from 'uuid';
import { inngest } from '../inngest/client.mjs';
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import path from 'path';
import fs from 'fs/promises';

export const chatbotHandler = async (req, res) => {
    try {
        const { message = '', mode = 'ask' } = req.body;
        const chat = await Chat.findOne({ userId: req.userId });
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (mode === 'llm') {
            const history = (chat?.chat || []).map(({ role, text }) => ({
                role: role === 'bot' ? 'assistant' : 'user',
                content: text
            }));
            const messages = [...history, { role: 'user', content: message }];
            const output = await llmChat(messages);
            res.json({ replay: output?.content });
        } else if (mode === 'ask') {
            const config = { configurable: { thread_id: chat?.chatId } };
            // Build message history from DB, mapping roles to LLM-friendly roles
            const history = (chat?.chat || []).map(({ role, text }) => ({
                role: role === 'bot' ? 'assistant' : 'user',
                content: text
            }));
            const messages = [...history, { role: 'user', content: message }];
            const output = await app.invoke({ messages }, config);
            const newConversation = [
                { role: 'user', text: message, id: `u-${Date.now()}`, timeStamp: new Date() },
                { role: 'bot', text: output.messages[output.messages.length - 1]?.content, id: `b-${Date.now()}`, timeStamp: new Date() }
            ];
            await Chat.findOneAndUpdate({ userId: req.userId }, { $push: { chat: { $each: newConversation } } });
            res.json({ replay: output.messages[output.messages.length - 1]?.content });
        } else if (mode === 'agent') {
            const output = await agent(message, req.userId, chat?.chatId);
            res.json({ replay: output });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong, Please try again' })
    }
}

export const initialChatMessage = async (req, res) => {
    try {
        const uuidv4 = uuid();
        const isChatCreated = await Chat.findOne({ userId: req.userId });
        let response = '';
        if (!isChatCreated) {
            const nwSchema = new Chat({
                chatId: uuidv4,
                chat: [],
                userId: req.userId
            })
            await nwSchema.save();
        } else {
            await Chat.findOneAndUpdate({ userId: req.userId }, { chatId: uuidv4, chat: [] });
        }
        const date = new Date();
        const beforeTwentyFour = new Date(date.getTime() - (24 * 60 * 60 * 1000));
        const eventBeforeOneDay = await Event.findOne({
            endTime: { $gte: beforeTwentyFour, $lt: date }
        }).populate('user', 'name email');
        if (eventBeforeOneDay) {
            // If an event exists, you can use it to initialize the chat
            response = await initializeChat(eventBeforeOneDay, uuidv4);
        } else {
            const eventAfterOneDay = await Event.findOne({
                startTime: { $lte: new Date(date.getTime() + (24 * 60 * 60 * 1000)), $gte: date }
            }).populate('user', 'name email');
            if (eventAfterOneDay) {
                response = await initializeChat(eventAfterOneDay, uuidv4);
            } else {
                // fetch random task with status in_progress
                const randomTask = await Task.aggregate([{ $match: { userId: req.userId, status: 'in_progress' } }, { $sample: { size: 1 } }]).populate('user', 'name email');
                if (randomTask.length > 0) {
                    response = await initializeChat(randomTask[0], uuidv4);
                } else {
                    res.status(404).json({ status: false, message: 'No tasks found' });
                }
            }
        }
        const isSameResponse = response && await Chat.findOne({
            userId: req.userId,
            lastGreeting: {
                $exists: true,
                $ne: '',
                $eq: response
            }
        });
        if (isSameResponse) {
            response = 'Hello! How can I assist you today?'
        } else {
            // Save the initial assistant message to chat history immediately
            await Chat.findOneAndUpdate(
                { userId: req.userId },
                { $push: { chat: { role: 'bot', text: response, id: `b-${Date.now()}`, timeStamp: new Date(), mode: 'ask' } }, lastGreeting: response }
            );
            inngest.send({
                name: 'save-initial-message',
                data: {
                    message: response,
                    userId: req.userId
                }
            }).catch(err => console.error(err))
        }
        res.status(200).json({ status: true, message: response });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong, Please try again' })
    }
}

export const voiceToTextConverter = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: false, message: 'No audio file provided' });
        }

        let buffer;
        let mimeType = req.file.mimetype || 'application/octet-stream';
        let originalName = req.file.originalname || 'audio';

        // Handle both memory storage (buffer) and disk storage (path)
        if (req.file.buffer) {
            buffer = req.file.buffer;
        } else if (req.file.path) {
            // Read from disk when using disk storage
            try {
                buffer = await fs.readFile('public\\audio\\mama.mp3');
            } catch (error) {
                return res.status(500).json({ status: false, message: 'Failed to read uploaded file', details: error.message });
            }
        } else {
            return res.status(400).json({ status: false, message: 'Invalid file upload - no buffer or path found' });
        }
        // let absolutePath = path.join(process.cwd(), 'public', 'audio', 'mama.mp3');
        // let buffer = await fs.readFile(absolutePath);
        // let originalName = path.basename(absolutePath);
        // const ext = path.extname(originalName).toLowerCase();
        // const mimeMap = {
        //     '.mp3': 'audio/mpeg',
        //     '.wav': 'audio/wav',
        //     '.ogg': 'audio/ogg',
        //     '.m4a': 'audio/mp4',
        //     '.aac': 'audio/aac',
        //     '.flac': 'audio/flac',
        //     '.webm': 'audio/webm',
        // };
        // let mimeType = mimeMap[ext] || 'application/octet-stream';

        const formData = new FormData();
        formData.append('file', new Blob([buffer], { type: mimeType }), originalName);
        formData.append('model', 'whisper-large-v3');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            return res.status(response.status).json({ status: false, message: 'Transcription API error', details: errText });
        }

        const transcription = await response.json();
        return res.status(200).json({ status: true, text: transcription?.text || '' });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: 'Something went wrong, Please try again' });
    }
}
