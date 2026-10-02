import { AIProvider } from '../provider';
import { FormatOutputSchema, FormatOutput } from '@/lib/validation/schemas';
import { buildFormatPrompt } from '@/lib/prompts/format';
import { getAllowedFormats } from '@/lib/domain/formats';

export async function recommendFormatModule(
  provider: AIProvider,
  params: {
    angle: string;
    trendTitle: string;
    platform: string;
    goal: string;
    targetAudience: string;
  }
): Promise<{ data: FormatOutput; meta: any }> {
  const allowedFormats = getAllowedFormats(params.platform);
  const { systemInstruction, userPrompt } = buildFormatPrompt({
    angle: params.angle,
    trendTitle: params.trendTitle,
    platform: params.platform,
    allowedFormats,
    goal: params.goal,
    targetAudience: params.targetAudience,
  });

  return provider.generateStructuredJSON<FormatOutput>(
    userPrompt,
    (raw) => FormatOutputSchema.parse(raw),
    { systemInstruction }
  );
}
