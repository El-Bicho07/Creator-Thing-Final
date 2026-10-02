import { executePlanAgent } from './src/graphs/plan/index.js';
import { createAiClient } from '@contentyou/ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function run() {
  if (!process.env.LANGCHAIN_API_KEY) {
    console.error("Error: LANGCHAIN_API_KEY is missing from .env");
    process.exit(1);
  }

  // Enable LangSmith tracing
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_ENDPOINT = "https://apac.api.smith.langchain.com";
  process.env.LANGCHAIN_PROJECT = "contentyou-agents";

  const aiClient = createAiClient({ 
    usageLedger: { 
      recordUsage: async () => {}, 
      getDailyUsage: async () => ({ tokens: 0, estimatedUsd: 0, quotaUnits: 0 }) 
    },
    researchCache: { 
      get: async () => null, 
      set: async () => {} 
    },
    config: { geminiApiKey: process.env.GEMINI_API_KEY }
  });

  const idea = "A video about how dopamine detox can change your productivity.";
  
  console.log(`Starting agent run with idea: "${idea}"`);
  const plan = await executePlanAgent(idea, aiClient);
  
  console.log("\n=====================");
  console.log("Agent Run Completed!");
  console.log("=====================\n");
  console.log("Check your LangSmith project 'contentyou-agents' for the trace.");
}

run().catch(console.error);
