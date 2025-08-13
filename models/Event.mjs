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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        address: {
            type: String,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        latitude: {
            type: Number,
            required: true
        }
    },
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        enum: ['open', 'cancelled'],
        default: 'open'
    }
}, { timestamps: true });

export const validateEvent = (event) => {
    const schema = joi.object({
        title: joi.string().min(3).max(100).required(),
        description: joi.string().min(10).max(500).required(),
        user: joi.string().required(),
        location: joi.object({
            address: joi.string().required(),
            longitude: joi.number().required(),
            latitude: joi.number().required()
        }).optional(),
        attendees: joi.array().items(joi.string()).optional(),
        startTime: joi.date().optional(),
        endTime: joi.date().optional(),
        status: joi.string().valid('open', 'cancelled').optional()
    });
    return schema.validate(event);
}

export default mongoose.model('Event', Event);
