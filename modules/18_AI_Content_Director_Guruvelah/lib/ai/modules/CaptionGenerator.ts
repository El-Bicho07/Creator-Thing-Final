import { AIProvider } from '../provider';
import { CaptionOutputSchema, CaptionOutput } from '@/lib/validation/schemas';
import { buildCaptionPrompt } from '@/lib/prompts/caption';
import { getPlatformConfig } from '@/lib/domain/platforms';

export async function generateCaptionModule(
  provider: AIProvider,
  params: {
    script: any;
    angle: string;
    platform: string;
    goal: string;
    modifierInstruction?: string;
  }
): Promise<{ data: CaptionOutput; meta: any }> {
  const config = getPlatformConfig(params.platform);
  const { systemInstruction, userPrompt } = buildCaptionPrompt({
    script: params.script,
    angle: params.angle,
    platform: params.platform,
    goal: params.goal,
    hashtagMin: config.hashtagMin,
    hashtagMax: config.hashtagMax,
    captionCharCap: config.captionCharCap,
    modifierInstruction: params.modifierInstruction,
  });

  return provider.generateStructuredJSON<CaptionOutput>(
    userPrompt,
    (raw) => CaptionOutputSchema.parse(raw),
    { systemInstruction }
  );
}
