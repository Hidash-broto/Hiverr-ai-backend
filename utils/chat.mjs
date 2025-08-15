import { ChatGroq } from "@langchain/groq";
import {
    START,
    END,
    MessagesAnnotation,
    StateGraph,
    MemorySaver,
} from '@langchain/langgraph'
import { ChatPromptTemplate } from "@langchain/core/prompts";

const llm = new ChatGroq({
    model: 'gemma2-9b-it',
    temperature: 0,
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

export const initializeChat = async (data, chatId) => {
    const prompt = `You are a warm, WhatsApp-style assistant for a task or event and scheduler.
    Task context (JSON): ${JSON.stringify(data)}

    Goal: send ONE short opening line that feels personal and starts a useful chat about this specific task/event.

    Do:
    - Refer to the task/event by name (or a natural paraphrase).
    - Gently acknowledge the likely vibe (busy, excited, stressed) using clues like due date, priority, status, notes.
    - Ask exactly ONE friendly, concrete question that helps progress: e.g., why it's important, any blockers, when to schedule it, reminder preference, need to break it into steps, or reschedule.
    - If due soon or overdue, surface that kindly and offer help; if completed, celebrate and ask for quick wrap‑up.
    - Keep it casual: 1–2 short sentences max, contractions ok, 0–1 emoji, tiny natural imperfection allowed.
    - If a name exists (assignee/owner/user), greet them briefly by first name.

    Don't:
    - Be long, list things, or ask multiple questions.
    - Say "As an AI" or mention metadata/JSON.

    Output only the message text.`
    const callModel = async (state) => {
        const response = await llm.invoke(state);
        return { messages: response }
    }
    const workflow = new StateGraph(MessagesAnnotation)
        .addNode("model", callModel)
        .addEdge(START, "model")
        .addEdge("model", END);

    const app = workflow.compile({ checkpointer: memory })
    const output = await app.invoke({ messages: prompt }, { configurable: { thread_id: chatId } });
    console.log(output, 'output from llm')
    return output.messages[output.messages.length - 1]?.content
}
