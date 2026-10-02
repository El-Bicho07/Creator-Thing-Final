import { RawTrend } from './google-trends';

export async function fetchHackerNewsTrends(): Promise<RawTrend[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = 'https://hn.algolia.com/api/v1/search?tags=front_page';
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    const hits = data.hits || [];

    return hits.slice(0, 15).map((hit: any) => ({
      title: hit.title || 'Tech Trend',
      description: `Front page Hacker News story with ${hit.points || 0} points and ${hit.num_comments || 0} comments.`,
      category: 'Technology',
      source: 'hacker_news',
      sourceUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      sourceMetrics: {
        points: hit.points || 0,
        comments: hit.num_comments || 0,
      },
      sourceSnippets: hit.title ? [hit.title] : [],
      detectedAt: new Date(hit.created_at || Date.now()),
    }));
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Hacker News fetch error:', err);
    return [];
  }
}
