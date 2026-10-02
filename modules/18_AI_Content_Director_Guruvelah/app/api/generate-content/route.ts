import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';
import { GenerateContentInputSchema } from '@/lib/validation/schemas';
import { GeminiAIProvider } from '@/lib/ai/gemini';
import { generateContentPackage } from '@/lib/ai/orchestrator';
import { aggregateCreatorMemory } from '@/lib/ai/memory';
import { checkUserUsageQuota, recordUsageEvent } from '@/lib/services/usage-service';
import { logAICall } from '@/lib/services/ai-log-service';

export const maxDuration = 60; // 60 seconds Vercel function execution cap

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const quota = await checkUserUsageQuota(supabase, user.id, 'generation');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: { code: 'QUOTA_EXCEEDED', message: `Daily generation limit reached (${quota.limit}/day). Resets at ${quota.resetAt}` } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const input = GenerateContentInputSchema.parse(body);

    // Load user creator profile
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'NO_PROFILE', message: 'Please complete creator onboarding first.' } },
        { status: 400 }
      );
    }

    // Load past generations for memory
    const { data: pastGens } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const memoryText = aggregateCreatorMemory(profile, pastGens || []);
    const provider = new GeminiAIProvider();

    // Prepare NDJSON text/event-stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (obj: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        };

        try {
          const contentPackage = await generateContentPackage(
            {
              topic: input.topic,
              sourceText: input.sourceText,
              lifecycleHint: input.lifecycleHint,
              profile,
              platform: input.platform,
              goal: input.goal,
              durationSec: input.durationSec,
              memoryText,
            },
            { provider },
            (stageEvent) => {
              sendEvent({ type: 'stage', ...stageEvent });
            }
          );

          // Save generation to DB
          const { data: genRow, error: saveErr } = await supabase
            .from('generations')
            .insert({
              user_id: user.id,
              trend_id: input.trendId || null,
              input_topic: input.topic,
              source_text: input.sourceText || null,
              platform: input.platform,
              content_goal: input.goal,
              duration_seconds: input.durationSec || 30,
              trend_analysis: contentPackage.trendAnalysis,
              creator_angle: contentPackage.creatorAngle,
              angle_details: contentPackage.angleDetails,
              content_concept: contentPackage.contentConcept,
              hooks: contentPackage.hooks,
              selected_hook: contentPackage.selectedHook,
              selected_hook_index: contentPackage.selectedHookIndex,
              script: contentPackage.script,
              format: contentPackage.format,
              format_details: contentPackage.formatDetails,
              shot_list: contentPackage.shotList,
              cta: contentPackage.cta,
              caption: contentPackage.caption,
              hashtags: contentPackage.hashtags,
              profile_snapshot: profile,
              prompt_versions: {
                trend: 'trend-analyzer-v1',
                angle: 'angle-generator-v1',
                hooks: 'hook-generator-v1',
                format: 'format-recommender-v1',
                script: 'script-generator-v1',
                caption: 'caption-generator-v1',
              },
              status: 'draft',
              is_saved: false,
            })
            .select('id')
            .single();

          if (saveErr) {
            console.error('Save generation DB error:', saveErr);
          }

          await recordUsageEvent(supabase, user.id, 'generation');
          await logAICall(supabase, {
            userId: user.id,
            module: 'Orchestrator',
            promptVersion: 'full-pipeline-v1',
            model: process.env.AI_MODEL || 'gemini-1.5-flash',
            latencyMs: 1200,
            success: true,
          });

          sendEvent({ type: 'result', generationId: genRow?.id || 'temp-id', contentPackage });
          controller.close();
        } catch (err: any) {
          sendEvent({ type: 'error', code: 'PIPELINE_ERROR', message: err.message || 'Generation pipeline failed' });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
