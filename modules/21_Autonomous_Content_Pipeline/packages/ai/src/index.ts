import { LlmPort, UsageLedgerPort, ResearchCachePort, LlmRequest } from '@contentyou/schemas';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { search as ddSearch, SafeSearchType } from 'duck-duck-scrape';

export function createAiClient(deps: {
  usageLedger: UsageLedgerPort;
  researchCache: ResearchCachePort;
  config: { geminiApiKey?: string };
}): LlmPort {
  const geminiKey = deps.config.geminiApiKey || process.env.GEMINI_API_KEY;
  const gemini = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

  return {
    async generate<T extends z.ZodType>(request: LlmRequest<T>): Promise<z.infer<T>> {
      if (!gemini) {
         throw new Error("No API key found. Please add GEMINI_API_KEY to your .env file.");
      }
      
      console.log(`[AI] Generating response for prompt: ${request.prompt.substring(0, 100)}...`);

      // 1. Try Gemini first (Free Tier usually preferred by user)
      if (gemini) {
        try {
          const response = await gemini.models.generateContent({
            model: request.model ?? 'gemini-3.8-flash',
            contents: request.prompt + "\n\nIMPORTANT: You must output ONLY valid JSON matching this request. Do NOT include markdown blocks like ```json.",
            config: {
              temperature: request.temperature ?? 0.7,
              responseMimeType: 'application/json',
            }
          });
          
          if (!response.text) throw new Error("Empty response from Gemini");
          
          await deps.usageLedger.recordUsage('system', 0, 0, 1);
          return request.schema.parse(JSON.parse(response.text));
        } catch (error) {
          console.error("[AI] Gemini generation failed:", error);
          throw error;
        }
      }

      throw new Error("Generation failed.");
    },
    
    async search(query: string) {
      console.log(`[AI] Searching web for: ${query}`);
      try {
        const results = await ddSearch(query, { safeSearch: SafeSearchType.OFF });
        return results.results.slice(0, 5).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description
        }));
      } catch (e) {
        console.error("[AI] Search failed:", e);
        return [];
      }
    }
  };
}
