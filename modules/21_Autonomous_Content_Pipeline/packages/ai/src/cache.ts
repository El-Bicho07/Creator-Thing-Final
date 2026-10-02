
import { ResearchCachePort } from '@contentyou/schemas';

export async function getOrSetCache<T>(
  cache: ResearchCachePort,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return cached;
  
  const fresh = await fetcher();
  await cache.set(key, fresh, ttl);
  return fresh;
}
