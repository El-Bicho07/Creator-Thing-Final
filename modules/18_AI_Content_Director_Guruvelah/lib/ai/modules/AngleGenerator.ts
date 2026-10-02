import { AIProvider } from '../provider';
import { AngleSchema, AngleOutput } from '@/lib/validation/schemas';
import { buildCreatorAnglePrompt } from '@/lib/prompts/creator-angle';
import { getGoalDirective } from '@/lib/domain/goals';
import { getLifecycleDirective } from '@/lib/domain/lifecycle';

export async function generateCreatorAngleModule(
  provider: AIProvider,
  params: {
    trendAnalysis: any;
    profile: any;
    platform: string;
    goal: string;
    memoryText?: string;
  }
): Promise<{ data: AngleOutput; meta: any }> {
  const goalDirective = getGoalDirective(params.goal);
  const lifecycleDirective = getLifecycleDirective(params.trendAnalysis?.lifecycle?.stage);

  const { systemInstruction, userPrompt } = buildCreatorAnglePrompt({
    trendAnalysis: params.trendAnalysis,
    niche: params.profile?.niche || 'General',
    subNiche: params.profile?.sub_niche,
    targetAudience: params.profile?.target_audience || 'General audience',
    platform: params.platform,
    goal: params.goal,
    contentStyle: params.profile?.content_style,
    tone: Array.isArray(params.profile?.tone) ? params.profile.tone : ['Casual'],
    experienceLevel: params.profile?.experience_level,
    creatorDescription: params.profile?.creator_description,
    memoryText: params.memoryText,
    goalDirective,
    lifecycleDirective,
  });

  return provider.generateStructuredJSON<AngleOutput>(
    userPrompt,
    (raw) => AngleSchema.parse(raw),
    { systemInstruction }
  );
}
