import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
    },
    chat: [{
        role: {
            type: String,
            enum: ['user', 'bot'],
            required: true
        },
        text: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true,
        },
        timeStamp: {
            type: Date,
            default: Date.now
        },
        mode: {
            type: String,
            default: 'ask',
            enum: ['llm', 'ask', 'agent']
        }
    }],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    lastGreeting: {
        type: String,
    },
}, { timestamps: true })

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;