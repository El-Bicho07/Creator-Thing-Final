
import { collections } from '../collections/index.js';

export async function runMigrations() {
  const applied = await collections._migrations.find({}).toArray();
  const appliedNames = new Set(applied.map(m => m.name));

  const run = async (name: string, fn: () => Promise<void>) => {
    if (!appliedNames.has(name)) {
      await fn();
      await collections._migrations.insertOne({ name, appliedAt: new Date() });
    }
  };

  await run('001_initial_indexes', async () => {
    await collections.pipelineRuns.createIndex({ status: 1, claimedAt: 1 });
    await collections.pipelineRuns.createIndex({ userId: 1, createdAt: -1 });
    await collections.runEvents.createIndex({ runId: 1, seq: 1 });
    await collections.researchCache.createIndex({ queryHash: 1 }, { unique: true });
    await collections.researchCache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collections.usageLedger.createIndex({ userId: 1, day: 1 }, { unique: true });
    await collections.socialAccounts.createIndex({ userId: 1, platform: 1 }, { unique: true });
    await collections.artifacts.createIndex({ runId: 1, format: 1 });
    await collections.scheduleEntries.createIndex({ userId: 1, scheduledFor: 1 });
  });
}
