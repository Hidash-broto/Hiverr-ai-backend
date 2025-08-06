import mongoose from 'mongoose';

const User = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    lastGeneratedOTP: {
        type: Number,
        default: null
    }
}, { timestamps: true });

export default mongoose.model('User', User);