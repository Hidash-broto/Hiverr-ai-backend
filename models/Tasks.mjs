import mongoose from 'mongoose';
import joi from "joi";

const Tasks = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'closed'],
        default: 'open'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date,
        required: false
    },
}, { timestamps: true });

export const validateTask = (task) => {
    const schema = joi.object({
        title: joi.string().min(3).max(100).required(),
        description: joi.string().min(5).max(500).optional(),
        status: joi.string().valid('open', 'in_progress', 'closed').optional(),
        user: joi.string().required(),
        priority: joi.string().valid('low', 'medium', 'high').optional(),
        dueDate: joi.date().allow(null).optional()
    });
    return schema.validate(task);
}

export default mongoose.model('Tasks', Tasks);
