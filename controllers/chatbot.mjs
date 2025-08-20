import Chat from '../models/Chat.mjs';
import { agent, app, initializeChat, llmChat } from '../utils/chat.mjs';
import Event from '../models/event.mjs';
import Task from '../models/Tasks.mjs';
import { v4 as uuid } from 'uuid'
import { inngest } from '../inngest/client.mjs';

export const chatbotHandler = async (req, res) => {
    try {
        const { message = '', mode = 'ask' } = req.body;
        const isChatCreated = await Chat.findOne({ userId: req.userId });
        if (!isChatCreated) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (mode === 'llm') {
            const output = await llmChat(message);
            res.json({ replay: output?.content });
        } else if (mode === 'ask') {
            const chat = await Chat.findOne({ userId: req.userId });
            const config = { configurable: { thread_id: chat?.chatId } };
            const output = await app.invoke({ messages: message }, config);
            const newConversation = [
                { role: 'user', text: message, id: `u-${Date.now()}`, timeStamp: new Date() },
                { role: 'bot', text: output.messages[output.messages.length - 1]?.content, id: `b-${Date.now()}`, timeStamp: new Date() }
            ]
            await Chat.findOneAndUpdate({ userId: req.userId }, { $push: { chat: { $each: newConversation } } });
            res.json({ replay: output.messages[output.messages.length - 1]?.content });
        } else if (mode === 'agent') {
            const output = await agent(message, req.userId);
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
