import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';
import { AnalyzeTrendInputSchema } from '@/lib/validation/schemas';
import { GeminiAIProvider } from '@/lib/ai/gemini';
import { analyzeTrendModule } from '@/lib/ai/modules/TrendAnalyzer';
import { checkUserUsageQuota, recordUsageEvent } from '@/lib/services/usage-service';
import { logAICall } from '@/lib/services/ai-log-service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const quota = await checkUserUsageQuota(supabase, user.id, 'trend_analysis');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: { code: 'QUOTA_EXCEEDED', message: `Daily trend analysis limit reached. Resets at ${quota.resetAt}` } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsedInput = AnalyzeTrendInputSchema.parse(body);

    const provider = new GeminiAIProvider();
    const startTime = Date.now();

    const { data: analysis, meta } = await analyzeTrendModule(
      provider,
      parsedInput.topic,
      parsedInput.sourceText,
      parsedInput.lifecycleHint
    );

    // Save/cache trend in DB
    const { data: trendRow, error: dbError } = await supabase
      .from('trends')
      .insert({
        user_id: user.id,
        title: analysis.trendTitle || parsedInput.topic,
        description: analysis.explanation,
        category: analysis.category,
        source: 'user',
        lifecycle_stage: analysis.lifecycle?.stage || 'unknown',
        lifecycle_basis: analysis.lifecycle?.basis || 'user',
        analysis,
        analysis_hash: `${parsedInput.topic}_${Date.now()}`,
        analyzed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    await recordUsageEvent(supabase, user.id, 'trend_analysis');
    await logAICall(supabase, {
      userId: user.id,
      module: 'TrendAnalyzer',
      promptVersion: 'trend-analyzer-v1',
      model: meta.model,
      latencyMs: meta.latencyMs,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      success: true,
    });

    return NextResponse.json({
      trendId: trendRow?.id || null,
      analysis,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'ANALYSIS_ERROR', message: err.message || 'Failed to analyze trend' } },
      { status: 500 }
    );
  }
}
