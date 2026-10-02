import { SupabaseClient } from '@supabase/supabase-js';

export interface AILogEntry {
  userId?: string | null;
  module: string;
  promptVersion: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
  errorCode?: string;
}

export async function logAICall(supabase: SupabaseClient, entry: AILogEntry) {
  try {
    await supabase.from('ai_logs').insert({
      user_id: entry.userId || null,
      module: entry.module,
      prompt_version: entry.promptVersion,
      model: entry.model,
      latency_ms: entry.latencyMs,
      input_tokens: entry.inputTokens || null,
      output_tokens: entry.outputTokens || null,
      success: entry.success,
      error_code: entry.errorCode || null,
    });
  } catch (err) {
    // Non-blocking log failure
    console.error('Failed to write AI log:', err);
  }
}
