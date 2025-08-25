import { Inngest } from "inngest";
import Chat from "../models/Chat.mjs";
import { agenticAiEventCreation, agenticAiTaskCreation } from "../helpers/agenticAiHelper.mjs";

const inngest = new Inngest({ id: "my-app" });

export const updateInitialMessage = inngest.createFunction(
    { id: 'save-message' },
    { event: 'save-initial-message' },
    async ({ event }) => {
        const { userId, message } = event?.data;
        await Chat.findOneAndUpdate(
            { userId },
            {
                lastGreeting: message,
                $push: { chat: { role: 'bot', text: message, id: `b-${Date.now()}`, timeStamp: new Date() } }
            },
        )
    }
)

export const taskAiAgentTool = inngest.createFunction(
    { id: 'task-ai-agent' },
    { event: 'create-task' },
    async ({ event }) => {        
        // Extract data directly from event.data (not from taskData)
        const { userId, title, description, dueDate, priority } = event.data;
        
        // Pass data to helper function with user field properly mapped
        await agenticAiTaskCreation({
            title, 
            dueDate,    
            description, 
            priority: typeof priority === 'string' ? priority.toLowerCase() : 'medium', 
            user: userId
        });
    }
)

export const eventAiAgentTool = inngest.createFunction(
    { id: 'event-ai-agent' },
    { event: 'create-event' },
    async ({ event }) => {
        const { userId, title, startTime, endTime, description } = event.data;

        await agenticAiEventCreation({
            title,
            startTime,
            endTime,
            description,
            user: userId
        });
    }
);
