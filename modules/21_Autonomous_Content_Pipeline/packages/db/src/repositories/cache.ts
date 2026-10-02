
import { collections } from '../collections/index.js';
import { ResearchCachePort } from '@contentyou/schemas';

export class MongoResearchCache implements ResearchCachePort {
  async get(queryHash: string): Promise<any | null> {
    const res = await collections.researchCache.findOne({ queryHash });
    if (!res) return null;
    if (res.expiresAt < new Date()) return null;
    return res.data;
  }
  async set(queryHash: string, data: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await collections.researchCache.updateOne(
      { queryHash },
      { $set: { data, expiresAt } },
      { upsert: true }
    );
  }
}
