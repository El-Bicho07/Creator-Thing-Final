import { SupabaseClient } from '@supabase/supabase-js';

export interface UsageQuotaStatus {
  allowed: boolean;
  usedCount: number;
  limit: number;
  kind: 'generation' | 'regeneration' | 'trend_analysis' | 'trend_refresh';
  resetAt: string;
}

export async function checkUserUsageQuota(
  supabase: SupabaseClient,
  userId: string,
  kind: 'generation' | 'regeneration' | 'trend_analysis' | 'trend_refresh'
): Promise<UsageQuotaStatus> {
  const limitMap: Record<string, number> = {
    generation: parseInt(process.env.DAILY_GENERATION_LIMIT || '15', 10),
    regeneration: parseInt(process.env.DAILY_REGEN_LIMIT || '60', 10),
    trend_analysis: 30,
    trend_refresh: 10,
  };

  const limit = limitMap[kind] || 15;

  // Calculate start of today (UTC)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', startOfDay);

  const usedCount = count || 0;
  const allowed = usedCount < limit;

  return {
    allowed,
    usedCount,
    limit,
    kind,
    resetAt: endOfDay,
  };
}

export async function recordUsageEvent(
  supabase: SupabaseClient,
  userId: string,
  kind: 'generation' | 'regeneration' | 'trend_analysis' | 'trend_refresh'
) {
  await supabase.from('usage_events').insert({
    user_id: userId,
    kind,
  });
}
