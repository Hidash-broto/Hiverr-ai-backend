import Task from '../models/Tasks.mjs';
import event from '../models/event.mjs';
import mongoose from 'mongoose';

export const dashboardData = async (req, res) => {
    try {
        const { month = 1 } = req.query;
        const today = new Date();
        const userId = req.userId;
        const taskStats = await Task.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    openTasks: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'open'] }, 1, 0]
                        }
                    },
                    completedTasks: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
                        }
                    },
                    inProgressTasks: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
                        }
                    },
                }
            },
            {
                $project: {
                    _id: 0,
                    totalTasks: 1,
                    openTasks: 1,
                    completedTasks: 1,
                    inProgressTasks: 1
                }
            }
        ]);

        const recentTasks = await Task.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5)

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const eventsData = await event.aggregate([
            {
                $match: {
                    user: mongoose.Types.ObjectId.createFromHexString(userId),
                    $expr: {
                        $eq: [{ $month: '$startTime' }, parseInt(month)]
                    }
                },
            },
            {
                $project: {
                    isToday: {
                        $and: [
                            { $gte: ['$startTime', startOfToday] },
                            { $lte: ['$startTime', endOfToday] }
                        ]
                    },
                    withinSevenDaysEvents: {
                        $and: [
                            { $gte: ['$startTime', new Date(today.getTime())] },
                            { $lte: ['$startTime', new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)] }
                        ]
                    },
                    event: '$$ROOT',
                }
            },
            {
                $group: {
                    _id: null,
                    todaysEvents: {
                        $push: {
                            $cond: [{ $eq: ['$isToday', true] }, '$event', '$$REMOVE'],
                        },
                    },
                    withinSevenDaysEvents: {
                        $push: {
                            $cond: [{ $eq: ['$withinSevenDaysEvents', true] }, '$event', '$$REMOVE'],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    todaysEvents: 1,
                    withinSevenDaysEvents: 1,
                },
            },
        ])

        res.status(200).json({
            status: true, data: {
                taskStats: { 
                    ...taskStats[0],
                    upcomingEvents: eventsData[0]?.withinSevenDaysEvents[0]?.length || 0,
                    todayEvents: eventsData[0]?.todaysEvents[0]?.length || 0,
                },
                todayEvents: eventsData[0]?.todaysEvents || [],
                upcomingEvents: eventsData[0]?.withinSevenDaysEvents || [],
                recentTasks: recentTasks || [],
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: error.message });
    }
}