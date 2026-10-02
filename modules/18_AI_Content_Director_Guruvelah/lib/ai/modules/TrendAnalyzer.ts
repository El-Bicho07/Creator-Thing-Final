import { AIProvider } from '../provider';
import { TrendAnalysisSchema, TrendAnalysis } from '@/lib/validation/schemas';
import { buildTrendAnalysisPrompt } from '@/lib/prompts/trend-analysis';

export async function analyzeTrendModule(
  provider: AIProvider,
  topic: string,
  sourceText?: string,
  lifecycleHint?: string
): Promise<{ data: TrendAnalysis; meta: any }> {
  const { systemInstruction, userPrompt } = buildTrendAnalysisPrompt(topic, sourceText, lifecycleHint);

  return provider.generateStructuredJSON<TrendAnalysis>(
    userPrompt,
    (raw) => TrendAnalysisSchema.parse(raw),
    { systemInstruction }
  );
}
