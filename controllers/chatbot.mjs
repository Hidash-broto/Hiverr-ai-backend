import Chat from '../models/Chat.mjs';
import { app, initializeChat } from '../utils/chat.mjs';
import Event from '../models/event.mjs';
import Task from '../models/Tasks.mjs';

export const chatbotHandler = async (req, res) => {
    try {
        const { message = '' } = req.body;
        const isChatCreated = await Chat.findOne({ userId: req.userId });
        if (!isChatCreated) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        const chat = await Chat.findOne({ userId: req.userId });
        const config = { configurable: { thread_id: chat?.chatId } };
        const output = await app.invoke({ messages: message }, config);
        console.log(output.messages[output.messages.length - 1]?.content);
        res.json({ replay: output.messages[output.messages.length - 1]?.content });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong, Please try again' })
    }
}

export const initialChatMessage = async (req, res) => {
    try {
        const uuidv4 = req.query?.uuidv4;
        const isChatCreated = await Chat.findOne({ userId: req.userId });
        if (!isChatCreated) {
            const nwSchema = new Chat({
                chatId: uuidv4,
                chat: [],
                userId: req.userId
            })
            await nwSchema.save();
        } else {
            await Chat.findOneAndUpdate({ userId: req.userId }, { chatId: uuidv4 });
        }
        const date = new Date();
        const beforeTwentyFour = new Date(date.getTime() - (24 * 60 * 60 * 1000));
        const eventBeforeOneDay = await Event.findOne({
            endTime: { $gte: beforeTwentyFour, $lt: date }
        })
        console.log(eventBeforeOneDay, 'eventBeforeOneDay')
        if (eventBeforeOneDay) {
            // If an event exists, you can use it to initialize the chat
            const response = await initializeChat(eventBeforeOneDay, uuidv4);
            res.status(200).json({ status: true, message: response });
        } else {
            const eventAfterOneDay = await Event.findOne({
                startTime: { $lte: new Date(date.getTime() + (24 * 60 * 60 * 1000)), $gte: date }
            })
            console.log(eventAfterOneDay, 'eventAfterOneDay')
            if (eventAfterOneDay) {
                const response = await initializeChat(eventAfterOneDay, uuidv4);
                res.status(200).json({ status: true, message: response });
            } else {
                // fetch random task with status in_progress
                const randomTask = await Task.aggregate([{ $match: { userId: req.userId, status: 'in_progress' } }, { $sample: { size: 1 } }]);
                if (randomTask.length > 0) {
                    const response = await initializeChat(randomTask[0], uuidv4);
                    res.status(200).json({ status: true, message: response });
                } else {
                    res.status(404).json({ status: false, message: 'No tasks found' });
                }
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong, Please try again' })
    }
}
