export interface RawTrend {
  title: string;
  description?: string;
  category?: string;
  source: string;
  sourceUrl?: string;
  sourceMetrics?: Record<string, string | number>;
  sourceSnippets?: string[];
  detectedAt: Date;
}

export async function fetchGoogleTrends(region: string = 'IN'): Promise<RawTrend[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(region)}`;
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const xml = await res.text();
    const trends: RawTrend[] = [];

    // Parse simple XML item tags
    const itemRegex = /<item>([\s+S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && trends.length < 15) {
      const itemXml = match[1];
      const titleMatch = /<title>(.*?)<\/title>/i.exec(itemXml);
      const approxTrafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/i.exec(itemXml);
      const newsTitleMatch = /<ht:news_item_title>(.*?)<\/ht:news_item_title>/i.exec(itemXml);
      const newsUrlMatch = /<ht:news_item_url>(.*?)<\/ht:news_item_url>/i.exec(itemXml);

      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
        const traffic = approxTrafficMatch ? approxTrafficMatch[1].trim() : undefined;
        const snippet = newsTitleMatch ? newsTitleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : undefined;
        const sourceUrl = newsUrlMatch ? newsUrlMatch[1].trim() : undefined;

        trends.push({
          title,
          description: snippet || `Trending in ${region} with ${traffic || 'high'} search volume.`,
          category: 'General',
          source: 'google_trends',
          sourceUrl,
          sourceMetrics: traffic ? { approx_searches: traffic } : undefined,
          sourceSnippets: snippet ? [snippet] : [],
          detectedAt: new Date(),
        });
      }
    }

    return trends;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Google Trends fetch error:', err);
    return [];
  }
}
