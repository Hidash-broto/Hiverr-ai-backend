import { ChatGroq } from "@langchain/groq";
import {
    START,
    END,
    MessagesAnnotation,
    StateGraph,
    MemorySaver,
} from '@langchain/langgraph'
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { initialChatPrompt } from "./constants.mjs";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import z from "zod";
import { inngest } from "../inngest/client.mjs";

const llm = new ChatGroq({
    model: 'gemma2-9b-it',
    temperature: 0.5,
})

const promptTemplate = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a casual, empathetic WhatsApp-style chat companion. 
         Sense the user's mood (sad, stressed, angry, excited, confused) and respond based on it. 
         Keep replies short, warm, and human-like. Acknowledge feelings first, then give a simple helpful note or suggestion. Optionally ask one short follow-up question.
         Mirror the user's language and vibe; use contractions. Add tiny, natural imperfections sometimes (1–2 small typos or casual punctuation), but don't overdo it. Use emoji sparingly (0–1) when it fits.
         Avoid long/robotic text, lists, or “As an AI” phrasing. Be respectful and safe; refuse harmful or hateful requests.`
    ],
    ["placeholder", "{messages}"],
]);

const callModel = async (state) => {
    const prompt = await promptTemplate.invoke(state);
    const response = await llm.invoke(prompt);
    return { messages: response }
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("model", callModel)
    .addEdge(START, "model")
    .addEdge("model", END);

const memory = new MemorySaver();
export const app = workflow.compile({ checkpointer: memory })

// Message history storage for agent conversations
const messageHistories = new Map();

export const initializeChat = async (data, chatId) => {
    const message = [{ role: 'user', content: initialChatPrompt(data) }];
    const output = await llm.invoke(message, { configurable: { thread_id: chatId } });
    return output.content;
}

export const llmChat = async (messages) => {
    const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0
    });
    return await llm.invoke(messages);
}

export const agent = async (input, userId, chatId = null) => {
    // Get or create message history for this chat session
    const sessionId = chatId || userId;
    if (!messageHistories.has(sessionId)) {
        messageHistories.set(sessionId, new ChatMessageHistory());
    }

    const addTaskTool = new DynamicStructuredTool({
        name: "addTask",
        description: "Add a new task to the list.",
        schema: z.object({
            title: z.string().describe("Task title"),
            description: z.string().describe("Task description"),
            dueDate: z.string().optional().describe("Optional due date (ISO string format)"),
            priority: z.enum(["high", "medium", "low"]).default("medium").describe("Task priority"),
        }),
        func: async ({ title, dueDate, description, priority }) => {
            try {
                console.log('Adding task:', { title, dueDate, description, priority });
                if (!title || !description) {
                    return "Title and description are required.";
                }
                // Send event with proper error handling
                await inngest.send({
                    name: 'create-task',
                    data: {
                        userId,
                        title,
                        description,
                        dueDate: dueDate ? new Date(dueDate) : null,
                        priority: priority || 'medium'
                    }
                });
                return `Task "${title}" has been added successfully.`;
            } catch (err) {
                console.error("Error sending task creation event:", err);
                return `Failed to create task "${title}". Error: ${err.message}`;
            }
        },
    });

    // Define the scheduleEvent tool using DynamicStructuredTool
    const scheduleEventTool = new DynamicStructuredTool({
        name: "scheduleEvent",
        description: "Add a new event to the list.",
        schema: z.object({
            title: z.string().describe("Event title"),
            startTime: z.string().describe("Event start date and time"),
            endTime: z.string().describe("Event end date and time"),
            description: z.string().describe("Event description"),
        }),
        func: async ({ title, startTime, endTime, description }) => {
            if (!title || !startTime || !endTime) {
                return "Title, start time, and end time are required.";
            }
            try {
                await inngest.send({
                    name: 'create-event',
                    data: {
                        userId,
                        title,
                        startTime: new Date(startTime),
                        endTime: new Date(endTime),
                        description
                    }
                });
                return `Event "${title}" scheduled from ${startTime} to ${endTime}.`;
            } catch (err) {
                return `Failed to schedule event "${title}". Error: ${err.message}`;
            }
        },
    });

    const tools = [addTaskTool, scheduleEventTool];
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a helpful assistant for managing tasks and events. Today's date is ${new Date().toLocaleDateString()}.

When adding a task, you need:
- Title (required from user)
- Description (create a more detailed explanation that expands on the title with additional context, purpose, or specific details)
- Priority (set appropriately based on these guidelines):
  * High: Only for truly urgent/critical tasks (deadlines within 24-48 hours, emergency situations, critical work deliverables)
  * Medium: For important but not urgent tasks (regular work items, commitments with flexible deadlines)
  * Low: For routine, casual, or non-urgent tasks (errands, shopping, leisure activities, future plans)
- DueDate (optional)

Examples of good descriptions:
- Title: "Buy medicine for mom" → Description: "Purchase vericose vein medication from the hospital pharmacy. Remember to bring the prescription and medical card."
- Title: "Submit report" → Description: "Complete and submit the quarterly financial analysis to the management team with all supporting documentation."

When scheduling an event, you need:
- Title (required from user)
- Description (create a detailed explanation including location, participants, purpose, and any preparation needed)
- StartTime (required - if user only provides a date without time, use 9:00 AM of that date)
- EndTime (required - if user doesn't specify, use 1 hour after start time)

Examples of good event descriptions:
- Title: "Team meeting" → Description: "Weekly project status meeting with the development team in Conference Room A. Prepare progress updates on assigned tasks and bring any blockers for discussion."
- Title: "Doctor appointment" → Description: "Annual checkup with Dr. Johnson at City Medical Center. Bring insurance card, list of current medications, and any recent test results. Arrive 15 minutes early to complete paperwork."

If the user doesn't provide required information, ask follow-up questions to get the missing details before executing any tool.

Remember previous conversations and refer to them when relevant. Be conversational and remember what the user has told you before.`],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
    ]);

    // Use ChatGoogleGenerativeAI for tool calling as it supports complex message structures
    const toolCallingLlm = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0
    });

    const agent = createToolCallingAgent({ llm: toolCallingLlm, tools, prompt });
    const executor = new AgentExecutor({ 
        agent, 
        tools,
        verbose: false 
    });

    // Create agent with message history
    const agentWithHistory = new RunnableWithMessageHistory({
        runnable: executor,
        getMessageHistory: (sessionId) => messageHistories.get(sessionId),
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
    });

    const result = await agentWithHistory.invoke(
        { input },
        { configurable: { sessionId } }
    );
    
    return result?.output;
}
