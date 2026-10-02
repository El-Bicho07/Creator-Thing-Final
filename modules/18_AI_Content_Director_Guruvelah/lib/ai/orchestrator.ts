import { AIProvider } from './provider';
import { analyzeTrendModule } from './modules/TrendAnalyzer';
import { generateCreatorAngleModule } from './modules/AngleGenerator';
import { generateHooksModule } from './modules/HookGenerator';
import { recommendFormatModule } from './modules/FormatRecommender';
import { generateScriptModule } from './modules/ScriptGenerator';
import { generateCaptionModule } from './modules/CaptionGenerator';
import { deriveShotList } from '@/lib/domain/shot-list';

export interface PipelineStageEvent {
  stage: 'trend' | 'angle' | 'hooks_format' | 'script' | 'caption' | 'complete';
  status: 'start' | 'success' | 'error';
  message?: string;
}

export interface OrchestratorInput {
  topic: string;
  sourceText?: string;
  lifecycleHint?: string;
  trendAnalysis?: any;
  profile: any;
  platform: string;
  goal: string;
  durationSec?: number;
  memoryText?: string;
}

export interface OrchestratorDeps {
  provider: AIProvider;
}

export async function generateContentPackage(
  input: OrchestratorInput,
  deps: OrchestratorDeps,
  onStage?: (event: PipelineStageEvent) => void
) {
  const { provider } = deps;

  // STAGE 1: TREND ANALYSIS
  let trend = input.trendAnalysis;
  if (!trend) {
    onStage?.({ stage: 'trend', status: 'start', message: 'Analyzing trend brief...' });
    const trendRes = await analyzeTrendModule(provider, input.topic, input.sourceText, input.lifecycleHint);
    trend = trendRes.data;
    onStage?.({ stage: 'trend', status: 'success' });
  }

  // STAGE 2: CREATOR ANGLE
  onStage?.({ stage: 'angle', status: 'start', message: 'Generating personalized creator angle...' });
  const angleRes = await generateCreatorAngleModule(provider, {
    trendAnalysis: trend,
    profile: input.profile,
    platform: input.platform,
    goal: input.goal,
    memoryText: input.memoryText,
  });
  const angleData = angleRes.data;
  onStage?.({ stage: 'angle', status: 'success' });

  // STAGE 3: HOOKS & FORMAT IN PARALLEL (Section 2 Item 17)
  onStage?.({ stage: 'hooks_format', status: 'start', message: 'Generating viral hooks & recommending format...' });
  const [hooksRes, formatRes] = await Promise.all([
    generateHooksModule(provider, {
      angle: angleData.angle,
      trendTitle: trend.trendTitle || input.topic,
      niche: input.profile?.niche || 'General',
      targetAudience: input.profile?.target_audience || 'General audience',
      platform: input.platform,
      goal: input.goal,
    }),
    recommendFormatModule(provider, {
      angle: angleData.angle,
      trendTitle: trend.trendTitle || input.topic,
      platform: input.platform,
      goal: input.goal,
      targetAudience: input.profile?.target_audience || 'General audience',
    }),
  ]);
  const hooksData = hooksRes.data;
  const formatData = formatRes.data;
  onStage?.({ stage: 'hooks_format', status: 'success' });

  // Pick default hook
  const selectedHookObj = hooksData.hooks[hooksData.topPickIndex] || hooksData.hooks[0];
  const selectedHook = selectedHookObj.text;

  // STAGE 4: SCRIPT GENERATION
  onStage?.({ stage: 'script', status: 'start', message: 'Building tailored script...' });
  const scriptRes = await generateScriptModule(provider, {
    angle: angleData.angle,
    hookText: selectedHook,
    format: formatData.recommendedFormat,
    platform: input.platform,
    durationSec: input.durationSec,
    niche: input.profile?.niche || 'General',
    tone: Array.isArray(input.profile?.tone) ? input.profile.tone : ['Casual'],
  });
  const scriptData = scriptRes.data;
  onStage?.({ stage: 'script', status: 'success' });

  // STAGE 5: CAPTION & CTA
  onStage?.({ stage: 'caption', status: 'start', message: 'Creating caption, CTA & hashtags...' });
  const captionRes = await generateCaptionModule(provider, {
    script: scriptData,
    angle: angleData.angle,
    platform: input.platform,
    goal: input.goal,
  });
  const captionData = captionRes.data;
  onStage?.({ stage: 'caption', status: 'success' });

  // STAGE 6: DERIVE SHOT LIST (Deterministic)
  const shotList = scriptData.kind === 'video' ? deriveShotList(scriptData) : [];

  onStage?.({ stage: 'complete', status: 'success', message: 'Content package generated successfully!' });

  return {
    trendAnalysis: trend,
    creatorAngle: angleData.angle,
    angleDetails: angleData,
    contentConcept: angleData.contentConcept,
    hooks: hooksData,
    selectedHook,
    selectedHookIndex: hooksData.topPickIndex,
    format: formatData.recommendedFormat,
    formatDetails: formatData,
    script: scriptData,
    shotList,
    cta: scriptData.ctaText || angleData.ctaDirection,
    caption: captionData.caption,
    hashtags: captionData.hashtags,
    title: captionData.title || scriptData.title,
  };
}
