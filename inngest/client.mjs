import { Inngest } from "inngest";
import { eventAiAgentTool, taskAiAgentTool, updateInitialMessage } from "./functions.mjs";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app", eventKey: process.env.EVENT_KEY });
    
// Create an empty array where we'll export future Inngest functions
export const functions = [
    updateInitialMessage,
    taskAiAgentTool,
    eventAiAgentTool
];
