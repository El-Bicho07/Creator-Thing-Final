import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';
import { GeminiAIProvider } from '@/lib/ai/gemini';
import { generateHooksModule } from '@/lib/ai/modules/HookGenerator';
import { generateScriptModule } from '@/lib/ai/modules/ScriptGenerator';
import { generateCaptionModule } from '@/lib/ai/modules/CaptionGenerator';
import { deriveShotList } from '@/lib/domain/shot-list';
import { checkUserUsageQuota, recordUsageEvent } from '@/lib/services/usage-service';

const MODIFIER_INSTRUCTIONS: Record<string, string> = {
  shorter: 'Make the text significantly more concise and punchy.',
  more_casual: 'Rewrite in a very casual, conversational, authentic tone.',
  more_bold: 'Rewrite with a bold, authoritative, high-impact framing.',
  more_educational: 'Focus heavily on clear step-by-step educational value.',
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: generationId } = await params;
    const supabase = await createServerSupabaseClient();

    const quota = await checkUserUsageQuota(supabase, user.id, 'regeneration');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: { code: 'QUOTA_EXCEEDED', message: `Daily section regeneration limit reached (${quota.limit}/day).` } },
        { status: 429 }
      );
    }

    // Load generation from DB
    const { data: gen } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generationId)
      .eq('user_id', user.id)
      .single();

    if (!gen) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Generation not found' } }, { status: 404 });
    }

    const body = await request.json();
    const { section, modifier } = body;

    const modifierInstruction = modifier ? MODIFIER_INSTRUCTIONS[modifier] || `Modifier: ${modifier}` : undefined;
    const provider = new GeminiAIProvider();

    const updatePayload: any = {};
    const regCounts = gen.regeneration_counts || {};
    regCounts[section] = (regCounts[section] || 0) + 1;
    updatePayload.regeneration_counts = regCounts;

    if (section === 'hooks') {
      const { data: newHooks } = await generateHooksModule(provider, {
        angle: gen.creator_angle,
        trendTitle: gen.input_topic,
        niche: gen.profile_snapshot?.niche || 'General',
        targetAudience: gen.profile_snapshot?.target_audience || 'General',
        platform: gen.platform,
        goal: gen.content_goal,
      });
      updatePayload.hooks = newHooks;
      updatePayload.selected_hook = newHooks.hooks[newHooks.topPickIndex]?.text || newHooks.hooks[0]?.text;
      updatePayload.selected_hook_index = newHooks.topPickIndex;
    } else if (section === 'script') {
      const { data: newScript } = await generateScriptModule(provider, {
        angle: gen.creator_angle,
        hookText: gen.selected_hook || 'Hook',
        format: gen.format,
        platform: gen.platform,
        durationSec: gen.duration_seconds,
        niche: gen.profile_snapshot?.niche || 'General',
        tone: Array.isArray(gen.profile_snapshot?.tone) ? gen.profile_snapshot.tone : ['Casual'],
        modifierInstruction,
      });

      updatePayload.script = newScript;
      if (newScript.kind === 'video') {
        updatePayload.shot_list = deriveShotList(newScript);
      }
    } else if (section === 'caption') {
      const { data: newCaption } = await generateCaptionModule(provider, {
        script: gen.script,
        angle: gen.creator_angle,
        platform: gen.platform,
        goal: gen.content_goal,
        modifierInstruction,
      });

      updatePayload.caption = newCaption.caption;
      updatePayload.hashtags = newCaption.hashtags;
    } else {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid regeneration section' } }, { status: 400 });
    }

    await supabase.from('generations').update(updatePayload).eq('id', generationId);
    await recordUsageEvent(supabase, user.id, 'regeneration');

    return NextResponse.json({ success: true, ...updatePayload });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'REGENERATION_ERROR', message: err.message } }, { status: 500 });
  }
}
