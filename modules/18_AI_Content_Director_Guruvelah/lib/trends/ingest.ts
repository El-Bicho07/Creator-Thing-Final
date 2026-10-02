import { SupabaseClient } from '@supabase/supabase-js';
import { fetchGoogleTrends } from './sources/google-trends';
import { fetchHackerNewsTrends } from './sources/hacker-news';

export async function ingestLiveTrends(supabase: SupabaseClient, region: string = 'IN') {
  const [googleTrends, hnTrends] = await Promise.all([
    fetchGoogleTrends(region),
    fetchHackerNewsTrends(),
  ]);

  const allTrends = [...googleTrends, ...hnTrends];
  let ingestedCount = 0;

  for (const trend of allTrends) {
    try {
      const { error } = await supabase.from('trends').upsert(
        {
          user_id: null, // global trend
          title: trend.title,
          description: trend.description,
          category: trend.category,
          source: trend.source,
          source_url: trend.sourceUrl,
          source_metrics: trend.sourceMetrics,
          source_snippets: trend.sourceSnippets,
          fetched_at: trend.detectedAt.toISOString(),
        },
        { onConflict: 'source,title' }
      );

      if (!error) ingestedCount++;
    } catch (e) {
      // Ignore individual trend write error
    }
  }

  // Purge trends older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('trends').delete().is('user_id', null).lt('fetched_at', sevenDaysAgo);

  return ingestedCount;
}
