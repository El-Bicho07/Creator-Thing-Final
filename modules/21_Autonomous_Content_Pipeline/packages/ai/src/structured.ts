
import { z } from 'zod';
import { withRetry } from './retry.js';

export async function generateStructured<T>(
  providerGenerate: (prompt: string, schema: z.ZodSchema<T>) => Promise<any>,
  prompt: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  return withRetry(async () => {
    const result = await providerGenerate(prompt, schema);
    const parsed = schema.safeParse(result);
    if (!parsed.success) {
       // We throw so withRetry catches and retries if we decide to. 
       // In a real implementation we'd feed the error back into the prompt for the retry.
       throw new Error("Schema validation failed: " + parsed.error.message);
    }
    return parsed.data;
  }, (err) => err.message.includes("Schema validation"));
}
