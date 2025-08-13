import Event, { validateEvent } from '../models/event.mjs';

export const createEvent = async (req, res) => {
    try {
        const { error } = await validateEvent({ ...req.body, user: req.userId });
        if (error) {
            console.log(error);
            return res.status(400).json({ message: 'Invalid event data', error: error.details });
        }
        
        let { startTime, endTime } = req.body;
        
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
            return res.status(400).json({
                message: 'Event time conflicts with another event',
                conflictingEvent: {
                    title: isOtherEventOnThatTime.title,
                    startTime: isOtherEventOnThatTime.startTime,
                    endTime: isOtherEventOnThatTime.endTime
                }
            });
        }

        const eventData = { 
            ...req.body, 
            user: req.userId,
            startTime,
            endTime
        };
        
        const event = new Event(eventData);
        await event.save();
        res.status(201).json({ status: true, message: 'Event created successfully', event });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating event', error });
    }
}

export const getEvents = async (req, res) => {
    try {
        const { query = '', filter = null } = req.query;
        const filterObject = {
            all: null,
            upcoming: { startTime: { $gte: new Date() } },
            ongoing: { startTime: { $lte: new Date() }, endTime: { $gte: new Date() } },
            completed: { endTime: { $lt: new Date() }, status: { $ne: 'cancelled' } },
            cancelled: { status: 'cancelled' }
        }
        const filters = {
            user: req.userId,
            ...(query && {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            }),
            ...(filter && filterObject[filter])
        };
        const events = await Event.find(filters).populate('user', 'name email').populate('attendees', 'name email');
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching events', error });
    }
}

export const updateEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { title, description, date, attendees } = req.body;
        if (!title || !date) {
            return res.status(400).json({ message: 'Title and date are required' });
        }
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        event.title = title;
        event.description = description;
        event.date = new Date(date);
        if (attendees) {
            event.attendees = attendees;
        }
        await event.save();
        res.status(200).json(event);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error updating event', error });
    }
}

export const deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findByIdAndDelete(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting event', error });
    }
}

export const eventBulkCreate = async (req, res) => {
    try {
        console.log(req.body);
        const eventsData = req.body;
        const events = await Event.insertMany(eventsData);
        res.status(201).json({ status: true, message: 'Events created successfully', events });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating events', error });
    }
}
