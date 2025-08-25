import Tasks, { validateTask } from "../models/Tasks.mjs";

export const getTasks = async (req, res) => {
    try {
        const { query = '', priority = '', status = '' } = req.query;
        const tasks = await Tasks.find(
            {
                user: req.userId,
                ...(['low', 'medium', 'high']?.includes(priority) && { priority }),
                ...(['closed', 'open', 'in_progress']?.includes(status) && { status }),
                ...(query && {
                    $or: [
                        { title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } }
                    ]
                })
            }
        )
            .sort({ createdAt: -1 })
            .populate('user', 'name email');
        res.status(200).json({ status: true, tasks });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error fetching tasks', error });
    }
}
export const createTask = async (req, res) => {
    try {
        let dueDate = req.body.dueDate;
        let dateObject = null;
        if (dueDate) {
            const [day, month, year] = dueDate.split('-').map(Number);
            dateObject = new Date(year, month - 1, day);
        }
        const { error } = validateTask({ ...req.body, user: req.userId, dueDate: dateObject });
        if (error) {
            return res.status(400).json({ status: false, message: 'Invalid task data', error });
        }
        const isSameTitle = await Tasks.findOne({ title: { $regex: req.body.title, $options: 'i' }, user: req.userId });
        if (isSameTitle) {
            return res.status(400).json({ status: false, message: 'Task with the same title already exists' });
        }
        const task = new Tasks({ ...req.body, user: req.userId, dueDate: dateObject });
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating task', error });
    }
}
export const bulkCreateTasks = async (req, res) => {
    try {
        const tasks = req.body.tasks.map(task => ({ ...task, user: req.userId }));
        const createdTasks = await Tasks.insertMany(tasks);
        res.status(201).json(createdTasks);
    } catch (error) {
        res.status(500).json({ message: 'Error creating tasks', error });
    }
}
export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        let dueDate = req.body.dueDate;
        let dateObject = null;
        if (dueDate) {
            const [day, month, year] = dueDate.split('-').map(Number);
            dateObject = new Date(year, month - 1, day);
        }
        const { errors } = validateTask({ ...req.body, user: req.userId, dueDate: dateObject });
        if (errors) {
            return res.status(400).json({ status: false, message: 'Invalid task data', errors });
        }
        const task = await Tasks.findOneAndUpdate({ _id: taskId, user: req.userId }, { ...req.body, dueDate: dateObject }, { new: true });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json({ status: true, task });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Error updating task', error });
    }
}
export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Tasks.findOneAndDelete({ _id: taskId, user: req.userId });
        if (!task) {
            return res.status(403).json({ message: 'Task not found' });
        }
        res.status(200).json({ status: true, message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error deleting task', error });
    }
}
export const getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Tasks.findOne({ _id: taskId, user: req.userId }).populate('user', 'name email');
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json({ status: true, task });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error fetching task', error });
    }
}
