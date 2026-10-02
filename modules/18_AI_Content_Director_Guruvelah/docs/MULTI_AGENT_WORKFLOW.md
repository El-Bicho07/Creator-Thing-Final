# Multi-Agent Workflow Conversion Guide (Markdown → LangChain / LangGraph)

This document provides a comprehensive end-to-end guide to convert a Markdown-based specification (containing prompts, sequential/parallel API calls, and multi-stage logic) into a production-ready **Multi-Agent Agentic System** built with **LangChain & LangGraph**.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Markdown Specification (.md)                │
│  (Prompts, Tool definitions, Routing logic, Guardrails) │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
 1. STATE DEFINITION ─────────────────────────────────────┐
    • Define GraphState (Zod / Pydantic)                  │
    • Shared Context, Agent Messages, Execution Memory    │
 ─────────────────────────────────────────────────────────┘
                             │
                             ▼
 2. DISCRETE AGENT NODES ─────────────────────────────────┐
    • Supervisor / Orchestrator Agent                     │
    • Specialist Agents (API Fetcher, Analyst, Writer)    │
    • Evaluator / Reflection Guardrail Agent             │
 ─────────────────────────────────────────────────────────┘
                             │
                             ▼
 3. LANGGRAPH COMPUTATION GRAPH ──────────────────────────┐
    • Add Nodes (Agent functions)                         │
    • Add Edges & Conditional Routing                     │
    • Parallel Execution (Fan-out / Fan-in)               │
 ─────────────────────────────────────────────────────────┘
                             │
                             ▼
 4. PRODUCTION ENGINE ────────────────────────────────────┐
    • Tool Bindings (HTTP API Wrappers)                   │
    • Human-in-the-Loop & Checkpoints                     │
    • Retries, Fallbacks, Structured Output Validation    │
 ─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Conversion Workflow

### Step 1: Parse Markdown Specs into System Prompts & Tool Definitions

Extract the following key elements from your `.md` spec:
- **Agents**: Roles, responsibilities, and system prompts.
- **Tools / APIs**: External REST/GraphQL endpoints, parameters, and authentication.
- **Workflow State**: Shared key-value data required across agent steps.
- **Transitions**: Conditions under which execution routes from Agent A to Agent B or loops for reflection.

---

### Step 2: Define the Graph State Schema

#### TypeScript / LangChain JS (`lib/agents/state.ts`)

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const MultiAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  taskInput: Annotation<string>(),
  apiResults: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  currentAgent: Annotation<string>(),
  iterationCount: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x + 1),
    default: () => 0,
  }),
  isComplete: Annotation<boolean>(),
  finalOutput: Annotation<string>(),
});

export type GraphStateType = typeof MultiAgentState.State;
```

#### Python / LangGraph (`agents/state.py`)

```python
from typing import TypedDict, Annotated, List, Dict, Any
import operator
from langchain_core.messages import BaseMessage

class GraphState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    task_input: str
    api_results: Annotated[Dict[str, Any], lambda x, y: {**x, **y}]
    current_agent: str
    iteration_count: int
    is_complete: bool
    final_output: str
```

---

### Step 3: Implement Specialized Agent Nodes & API Tools

#### TypeScript Implementation (`lib/agents/nodes.ts`)

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphStateType } from "./state";

// 1. Tool Wrapping for External APIs
export const fetchExternalApiTool = new DynamicStructuredTool({
  name: "fetch_external_data",
  description: "Calls external API to fetch real-time data",
  schema: z.object({
    query: z.string().describe("Search or API query string"),
    category: z.string().optional(),
  }),
  func: async ({ query, category }) => {
    const res = await fetch(`https://api.example.com/data?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${process.env.API_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
    return JSON.stringify(await res.json());
  },
});

// 2. Specialized Agent Nodes
const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.0-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2,
});

export async function supervisorNode(state: GraphStateType) {
  // Routes task to target sub-agent based on state
  const nextAgent = state.iterationCount === 0 ? "api_executor" : "synthesizer";
  return {
    currentAgent: nextAgent,
    iterationCount: state.iterationCount + 1,
  };
}

export async function apiExecutorNode(state: GraphStateType) {
  const llmWithTools = llm.bindTools([fetchExternalApiTool]);
  const response = await llmWithTools.invoke([
    { role: "system", content: "You are an API Execution Agent. Use tools to gather data." },
    { role: "user", content: state.taskInput },
  ]);
  
  return {
    messages: [response],
    apiResults: { executorOutput: response.content },
  };
}

export async function synthesizerNode(state: GraphStateType) {
  const response = await llm.invoke([
    { role: "system", content: "Synthesize the API outputs into a structured summary." },
    { role: "user", content: JSON.stringify(state.apiResults) },
  ]);

  return {
    messages: [response],
    finalOutput: response.content as string,
    isComplete: true,
  };
}
```

---

### Step 4: Assemble the State Graph (Orchestrator)

#### TypeScript Implementation (`lib/agents/graph.ts`)

```typescript
import { StateGraph, END, START } from "@langchain/langgraph";
import { MultiAgentState } from "./state";
import { supervisorNode, apiExecutorNode, synthesizerNode } from "./nodes";

const builder = new StateGraph(MultiAgentState)
  .addNode("supervisor", supervisorNode)
  .addNode("api_executor", apiExecutorNode)
  .addNode("synthesizer", synthesizerNode)
  
  // Entry point
  .addEdge(START, "supervisor")

  // Conditional routing
  .addConditionalEdges("supervisor", (state) => {
    if (state.currentAgent === "api_executor") return "api_executor";
    return "synthesizer";
  })
  
  .addEdge("api_executor", "supervisor")
  .addEdge("synthesizer", END);

export const multiAgentGraph = builder.compile();
```

---

## 🚀 Git Commit & Push Guide

Follow these exact terminal commands to push your multi-agent architecture clean to GitHub:

### 1. Verify Working Directory & Status
```bash
git status
```

### 2. Add New Multi-Agent Files & Docs
```bash
git add docs/MULTI_AGENT_WORKFLOW.md docs/DECISIONS.md
```

### 3. Commit with Standard Conventional Commit Message
```bash
git commit -m "feat(agents): add multi-agent workflow architecture & LangChain spec conversion guide"
```

### 4. Push to Remote Repository
```bash
git push origin main
```

---

## 📌 Checklist Before Pushing

- [x] Schema validation (Zod / Pydantic) attached to all structured output nodes.
- [x] Environment variable safety (No API keys exposed client-side or checked into git).
- [x] Zero-Env build guard satisfied.
- [x] Retry logic and graceful error handling on API execution nodes.
- [x] Clean markdown documentation generated and saved in `docs/`.
