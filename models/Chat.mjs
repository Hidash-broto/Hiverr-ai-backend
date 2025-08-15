import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
    },
    chat: [{
        role: {
            type: String,
            enum: ['user', 'hiverr'],
            required: true
        },
        message: {
            type: String,
            required: true
        }
    }],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    }
}, { timestamps: true })

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;