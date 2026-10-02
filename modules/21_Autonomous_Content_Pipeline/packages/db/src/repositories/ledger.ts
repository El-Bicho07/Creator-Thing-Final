
import { collections } from '../collections/index.js';
import { UsageLedgerPort } from '@contentyou/schemas';

export class MongoUsageLedger implements UsageLedgerPort {
  async recordUsage(userId: string, tokens: number, estimatedUsd: number, quotaUnits: number): Promise<void> {
    const day = new Date().toISOString().split('T')[0];
    await collections.usageLedger.updateOne(
      { userId, day },
      {
        $inc: { tokens, estimatedUsd, quotaUnits },
        $setOnInsert: { id: `${userId}-${day}` }
      },
      { upsert: true }
    );
  }
  async getDailyUsage(userId: string, day: string) {
    const res = await collections.usageLedger.findOne({ userId, day });
    if (!res) return { tokens: 0, estimatedUsd: 0, quotaUnits: 0 };
    return { tokens: res.tokens, estimatedUsd: res.estimatedUsd, quotaUnits: res.quotaUnits };
  }
}
