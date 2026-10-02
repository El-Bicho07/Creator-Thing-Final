export interface AICompletionOptions {
  systemInstruction?: string;
  responseSchema?: any;
  temperature?: number;
  timeoutMs?: number;
}

export interface AICompletionResult {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIProvider {
  generateStructuredJSON<T>(
    prompt: string,
    validator: (data: unknown) => T,
    options?: AICompletionOptions
  ): Promise<{ data: T; meta: AICompletionResult }>;
}
