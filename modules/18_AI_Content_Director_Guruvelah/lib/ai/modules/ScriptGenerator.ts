import { AIProvider } from '../provider';
import { ScriptOutputSchema, ScriptOutput } from '@/lib/validation/schemas';
import { buildScriptPrompt } from '@/lib/prompts/script';
import { getPlatformConfig } from '@/lib/domain/platforms';
import { allocateSegments } from '@/lib/domain/timing';
import { validateScriptOutput } from '../validators';

export async function generateScriptModule(
  provider: AIProvider,
  params: {
    angle: string;
    hookText: string;
    format: string;
    platform: string;
    durationSec?: number;
    niche: string;
    tone: string[];
    modifierInstruction?: string;
  }
): Promise<{ data: ScriptOutput; meta: any }> {
  const config = getPlatformConfig(params.platform);
  const isVideo = config.kind === 'video';
  const durationSec = isVideo
    ? params.durationSec || config.defaultDurationSec || 30
    : undefined;
  const timingSlots = isVideo ? allocateSegments(durationSec) : undefined;

  const { systemInstruction, userPrompt } = buildScriptPrompt({
    angle: params.angle,
    hookText: params.hookText,
    format: params.format,
    platform: params.platform,
    kind: config.kind,
    durationSec,
    timingSlots,
    niche: params.niche,
    tone: params.tone,
    modifierInstruction: params.modifierInstruction,
  });

  const result = await provider.generateStructuredJSON<ScriptOutput>(
    userPrompt,
    (raw) => ScriptOutputSchema.parse(raw),
    { systemInstruction }
  );

  const validation = validateScriptOutput(result.data, config.kind, durationSec);
  if (!validation.valid) {
    const retryPrompt = `${userPrompt}\n\nPREVIOUS SCRIPT HAD VALIDATION ERRORS:\n- ${validation.errors.join('\n- ')}\nFix these issues strictly.`;
    return provider.generateStructuredJSON<ScriptOutput>(
      retryPrompt,
      (raw) => ScriptOutputSchema.parse(raw),
      { systemInstruction }
    );
  }

  return result;
}
