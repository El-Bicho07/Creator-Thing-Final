import { GoogleGenAI } from '@google/genai';
import { AIProvider, AICompletionOptions, AICompletionResult } from './provider';

export class GeminiAIProvider implements AIProvider {
  private client: GoogleGenAI | null = null;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
    this.defaultModel = model || process.env.AI_MODEL || 'gemini-3.5-flash-lite';
  }

  async generateStructuredJSON<T>(
    prompt: string,
    validator: (data: unknown) => T,
    options?: AICompletionOptions
  ): Promise<{ data: T; meta: AICompletionResult }> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const startTime = Date.now();
    const modelName = this.defaultModel;

    const response = await this.client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        responseMimeType: 'application/json',
        temperature: options?.temperature ?? 0.7,
      },
    });

    const latencyMs = Date.now() - startTime;
    const rawText = response.text || '';

    // Strip markdown code fences if model returned ```json ... ```
    const cleanedText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      throw new Error(`Invalid JSON output from Gemini model: ${cleanedText}`);
    }

    const data = validator(parsed);

    const meta: AICompletionResult = {
      text: rawText,
      model: modelName,
      latencyMs,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };

    return { data, meta };
  }
}
