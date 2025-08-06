import Event from '../models/event.mjs';

export const createEvent = async (req, res) => {
    try {
        const { error } = Event.validateEvent({ ...req.body, user: req.userId });
        if (error) {
            return res.status(400).json({ message: 'Invalid event data', error: error.details });
        }
        const event = new Event({ ...req.body, user: req.userId });
        await event.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Error creating event', error });
    }
}

export const getEvents = async (req, res) => {
    try {
        const { query = '', startDate, endDate } = req.query;
        const filters = {
            ...(query && { title: { $regex: query, $options: 'i' } }),
            ...(startDate && { date: { $gte: new Date(startDate) } }),
            ...(endDate && { date: { $lte: new Date(endDate) } })
        };
        const events = await Event.find(filters).populate('user', 'name email').populate('attendees', 'name email');
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching events', error });
    }
}