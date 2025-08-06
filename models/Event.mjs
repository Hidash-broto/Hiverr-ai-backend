import mongoose from "mongoose";
import joi from "joi";

const Event = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: String,
        required: false
    },
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    startTime: {
        type: String,
        required: false
    },
    endTime: {
        type: String,
        required: false
    }
}, { timestamps: true });

export const validateEvent = (event) => {
    const schema = joi.object({
        title: joi.string().min(3).max(100).required(),
        description: joi.string().min(10).max(500).required(),
        date: joi.date().required(),
        user: joi.string().required(),
        location: joi.object({
            address: joi.string().required(),
            longitude: joi.number().required(),
            latitude: joi.number().required()
        }).optional(),
        attendees: joi.array().items(joi.string()).optional(),
        startTime: joi.string().optional(),
        endTime: joi.string().optional()
    });
    return schema.validate(event);
}

export default mongoose.model('Event', Event);
