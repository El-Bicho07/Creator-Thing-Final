import { StateGraph, Annotation } from "@langchain/langgraph";
import { LlmPort, Plan } from '@contentyou/schemas';
import { z } from 'zod';
import { PlanSchema } from '@contentyou/schemas';
import crypto from 'crypto';

export const PlanStateAnnotation = Annotation.Root({
  idea: Annotation<string>(),
  queries: Annotation<string[]>(),
  researchData: Annotation<any[]>(),
  plan: Annotation<Plan | null>(),
  criticFeedback: Annotation<string | null>(),
  revisionCount: Annotation<number>({
    reducer: (curr, update) => curr + update,
    default: () => 0
  }),
});

export async function executePlanAgent(idea: string, llm: LlmPort): Promise<Plan> {
  console.log(`[Agent] Starting autonomous plan generation for idea: "${idea}"`);
  
  const formulateQueriesNode = async (state: typeof PlanStateAnnotation.State) => {
    console.log(`[Agent] Formulating research queries...`);
    const querySchema = z.object({
      queries: z.array(z.string()).describe("3 targeted search queries to research the idea and find viral/best content")
    });
    
    const queryResult = await llm.generate({
      prompt: `The user wants to create content based on this idea: "${state.idea}". 
Generate 3 highly targeted internet search queries to find the best, most viral, and most factual information related to this.`,
      schema: querySchema,
      temperature: 0.7
    });
    
    return { queries: queryResult.queries };
  };

  const executeSearchesNode = async (state: typeof PlanStateAnnotation.State) => {
    console.log(`[Agent] Executing searches...`);
    const researchData = [];
    for (const query of state.queries || []) {
      const results = await llm.search(query);
      researchData.push({ query, results });
    }
    return { researchData };
  };

  const generatePlanNode = async (state: typeof PlanStateAnnotation.State) => {
    console.log(`[Agent] Synthesizing research and generating plan (revision: ${state.revisionCount})...`);
    
    let prompt = `You are an expert content strategist.
Idea: "${state.idea}"

Research Context from Web:
${JSON.stringify(state.researchData, null, 2)}

Create a detailed content plan based on this idea and research. 
The plan should have sections (e.g. "Hook", "Body", "Call to Action") with claims.
Each claim must include citationIds mapping to the URLs found in the research context. Ensure citationIds array is never empty.
`;

    if (state.criticFeedback) {
      prompt += `\n\nPrevious Plan Feedback to address:\n${state.criticFeedback}`;
    }

    const planResult = await llm.generate({
      prompt,
      schema: PlanSchema.omit({ id: true, runId: true, version: true, createdAt: true }),
      temperature: 0.5,
      model: "gemini-3.1-pro"
    });
    
    const plan: Plan = {
      ...planResult,
      id: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      version: state.revisionCount + 1,
      createdAt: new Date()
    };
    
    return { plan, revisionCount: 1 };
  };

  const criticNode = async (state: typeof PlanStateAnnotation.State) => {
    console.log(`[Agent] Critiquing plan...`);
    const criticSchema = z.object({
      approved: z.boolean().describe("True if the plan is excellent and has no missing citations"),
      feedback: z.string().describe("Constructive feedback on what to improve, or empty if approved")
    });

    const criticResult = await llm.generate({
      prompt: `Critique the following content plan:
${JSON.stringify(state.plan, null, 2)}

Check against this rubric:
1. Are citations missing for any claims? (Automatic fail)
2. Is the hook strong?
3. Is it aligned with the original idea? "${state.idea}"

Return whether it's approved and any feedback.`,
      schema: criticSchema,
      temperature: 0.2,
      model: "gemini-3.1-pro"
    });

    if (criticResult.approved) {
      return { criticFeedback: null };
    } else {
      return { criticFeedback: criticResult.feedback };
    }
  };

  const shouldRevise = (state: typeof PlanStateAnnotation.State) => {
    if (state.criticFeedback === null) {
      return "end";
    }
    if (state.revisionCount >= 3) {
      console.log(`[Agent] Max revisions reached. Proceeding with current plan.`);
      return "end";
    }
    return "generatePlan";
  };

  const workflow = new StateGraph(PlanStateAnnotation)
    .addNode("formulateQueries", formulateQueriesNode)
    .addNode("executeSearches", executeSearchesNode)
    .addNode("generatePlan", generatePlanNode)
    .addNode("critic", criticNode)
    .addEdge("__start__", "formulateQueries")
    .addEdge("formulateQueries", "executeSearches")
    .addEdge("executeSearches", "generatePlan")
    .addEdge("generatePlan", "critic")
    .addConditionalEdges("critic", shouldRevise, {
      "generatePlan": "generatePlan",
      "end": "__end__"
    });

  const app = workflow.compile();

  const finalState = await app.invoke({
    idea,
    queries: [],
    researchData: [],
    plan: null,
    criticFeedback: null,
    revisionCount: 0
  });

  return finalState.plan as Plan;
}
