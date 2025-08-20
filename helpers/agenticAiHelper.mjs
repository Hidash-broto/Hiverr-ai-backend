import { validateEvent } from "../models/event.mjs";
import Tasks, { validateTask } from "../models/Tasks.mjs";
import Event from '../models/event.mjs';

export const agenticAiTaskCreation = async ({ title, dueDate, description, priority, user }) => {
    try {

        if (!user) {
            console.error('User ID is missing');
            return { status: false, message: 'User ID is required', error: 'Missing user ID' };
        }

        const { error } = validateTask({ title, dueDate, description, priority, user });
        if (error) {
            console.error('Task validation error:', error);
            return { status: false, message: 'Invalid task data', error };
        }

        // Create and save the task
        const task = new Tasks({
            title,
            description: description || `Task created via AI assistant`,
            dueDate: dueDate == null ? null : new Date(dueDate),
            priority: priority || 'medium',
            user
        });

        const result = await task.save();
        return { status: true, message: 'Task created successfully', task: result };
    } catch (error) {
        console.error('Error creating task:', error);
        return { status: false, message: 'Error creating task', error };
    }
}

export const agenticAiEventCreation = async ({ title, startTime, endTime, description, user }) => {
try {
        const { error } = await validateEvent({ title, startTime, endTime, description, user });
        if (error) {
            console.log(error);
            return { message: 'Invalid event data', error: error.details };
        }

        if (startTime) {
            startTime = new Date(startTime);
        }
        if (endTime) {
            endTime = new Date(endTime);
        }

        // Check for time conflicts with existing events
        const isOtherEventOnThatTime = await Event.findOne({
            user: req.userId,
            $or: [
                // New event starts during existing event
                { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
                // New event ends during existing event
                { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
                // New event completely contains existing event
                { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
            ]
        });

        if (isOtherEventOnThatTime) {
            return {
                message: 'Event time conflicts with another event',
                conflictingEvent: {
                    title: isOtherEventOnThatTime.title,
                    startTime: isOtherEventOnThatTime.startTime,
                    endTime: isOtherEventOnThatTime.endTime
                }
            };
        }

        const eventData = {
            title,
            description,
            user,
            startTime,
            endTime
        };

        const event = new Event(eventData);
        await event.save();
        return { status: true, message: 'Event created successfully', event };
    } catch (error) {
        console.log(error);
        return { status: 500, message: 'Error creating event', error };
    }
}