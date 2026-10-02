import { AIProvider } from '../provider';
import { HooksOutputSchema, HooksOutput } from '@/lib/validation/schemas';
import { buildHooksPrompt } from '@/lib/prompts/hooks';
import { getGoalDirective } from '@/lib/domain/goals';
import { validateHooksOutput } from '../validators';

export async function generateHooksModule(
  provider: AIProvider,
  params: {
    angle: string;
    trendTitle: string;
    niche: string;
    targetAudience: string;
    platform: string;
    goal: string;
  }
): Promise<{ data: HooksOutput; meta: any }> {
  const goalDirective = getGoalDirective(params.goal);
  const { systemInstruction, userPrompt } = buildHooksPrompt({
    angle: params.angle,
    trendTitle: params.trendTitle,
    niche: params.niche,
    targetAudience: params.targetAudience,
    platform: params.platform,
    goal: params.goal,
    goalDirective,
  });

  const result = await provider.generateStructuredJSON<HooksOutput>(
    userPrompt,
    (raw) => HooksOutputSchema.parse(raw),
    { systemInstruction }
  );

  const validation = validateHooksOutput(result.data, params.platform);
  if (!validation.valid) {
    // Single retry on semantic validation error
    const retryPrompt = `${userPrompt}\n\nPREVIOUS GENERATION HAD VALIDATION ERRORS:\n- ${validation.errors.join('\n- ')}\nFix these errors strictly.`;
    return provider.generateStructuredJSON<HooksOutput>(
      retryPrompt,
      (raw) => HooksOutputSchema.parse(raw),
      { systemInstruction }
    );
  }

  return result;
}
