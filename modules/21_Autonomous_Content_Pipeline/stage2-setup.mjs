import fs from 'fs';
import path from 'path';

const out = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
};

const pkgPath = 'packages/db/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = {
  ...pkg.dependencies,
  "@contentyou/schemas": "workspace:*",
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

out('packages/db/src/client.ts', `
import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function connect(uri: string) {
  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
  }
  return client;
}

export function getClient() {
  if (!client) throw new Error("Database not connected");
  return client;
}

export async function close() {
  if (client) {
    await client.close();
    client = null;
  }
}
`);

out('packages/db/src/collections/index.ts', `
import { getClient } from '../client.js';

export function getDb() {
  return getClient().db();
}

export const collections = {
  get pipelineRuns() { return getDb().collection('pipelineRuns'); },
  get runEvents() { return getDb().collection('runEvents'); },
  get researchCache() { return getDb().collection('researchCache'); },
  get usageLedger() { return getDb().collection('usageLedger'); },
  get socialAccounts() { return getDb().collection('socialAccounts'); },
  get artifacts() { return getDb().collection('artifacts'); },
  get scheduleEntries() { return getDb().collection('scheduleEntries'); },
  get _migrations() { return getDb().collection('_migrations'); },
};
`);

out('packages/db/src/queue.ts', `
import { collections } from './collections/index.js';
import { PipelineRunSchema, PipelineRun } from '@contentyou/schemas';

export async function enqueue(run: any): Promise<void> {
  const validated = PipelineRunSchema.parse({ ...run, status: 'queued' });
  await collections.pipelineRuns.insertOne(validated);
}

export async function claim(workerId: string, staleCutoff: Date): Promise<PipelineRun | null> {
  const result = await collections.pipelineRuns.findOneAndUpdate(
    {
      status: { $in: ['queued', 'running'] },
      $or: [
        { status: 'queued' },
        { status: 'running', claimedAt: { $lt: staleCutoff } }
      ]
    },
    {
      $set: { status: 'running', claimedAt: new Date(), workerId }
    },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );
  return result ? PipelineRunSchema.parse(result) : null;
}

export async function heartbeat(runId: string, workerId: string): Promise<void> {
  const result = await collections.pipelineRuns.updateOne(
    { id: runId, workerId },
    { $set: { claimedAt: new Date() } }
  );
  if (result.matchedCount === 0) {
    throw new Error("Run reclaimed or not found");
  }
}

export async function complete(runId: string, workerId: string): Promise<void> {
  const result = await collections.pipelineRuns.updateOne(
    { id: runId, workerId, status: 'running' },
    { $set: { status: 'completed', 'timings.completedAt': new Date() } }
  );
  if (result.matchedCount === 0) throw new Error("Invalid transition");
}

export async function fail(runId: string, workerId: string): Promise<void> {
  await collections.pipelineRuns.updateOne(
    { id: runId, workerId, status: 'running' },
    { $set: { status: 'failed', 'timings.completedAt': new Date() } }
  );
}
`);

out('packages/db/src/repositories/ledger.ts', `
import { collections } from '../collections/index.js';
import { UsageLedgerPort } from '@contentyou/schemas';

export class MongoUsageLedger implements UsageLedgerPort {
  async recordUsage(userId: string, tokens: number, estimatedUsd: number, quotaUnits: number): Promise<void> {
    const day = new Date().toISOString().split('T')[0];
    await collections.usageLedger.updateOne(
      { userId, day },
      {
        $inc: { tokens, estimatedUsd, quotaUnits },
        $setOnInsert: { id: \`\${userId}-\${day}\` }
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
`);

out('packages/db/src/repositories/cache.ts', `
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
`);

out('packages/db/src/migrations/index.ts', `
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
`);

out('packages/db/src/index.ts', `
export * from './client.js';
export * from './collections/index.js';
export * from './queue.js';
export * from './repositories/ledger.js';
export * from './repositories/cache.js';
export * from './migrations/index.js';
`);

out('packages/db/src/queue.test.ts', `
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, close } from './client.js';
import { collections, getDb } from './collections/index.js';
import { enqueue, claim, heartbeat, complete } from './queue.js';
import { runMigrations } from './migrations/index.js';
import { PipelineRunSchema } from '@contentyou/schemas';
import { MongoUsageLedger } from './repositories/ledger.js';
import { MongoResearchCache } from './repositories/cache.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connect(mongod.getUri());
});

afterAll(async () => {
  await close();
  await mongod.stop();
});

beforeEach(async () => {
  await getDb().dropDatabase();
  await runMigrations();
});

describe('Database Tests', () => {
  it('Concurrent claim: 10 simultaneous claim() on 1 run → exactly one succeeds', async () => {
    await enqueue({
      id: 'run-1', userId: 'u1', threadId: 't1', timings: {}, costSummary: {}, createdAt: new Date()
    });
    
    const claims = await Promise.all(
      Array.from({ length: 10 }).map((_, i) => claim(\`worker-\${i}\`, new Date(Date.now() - 10000)))
    );
    
    const successful = claims.filter(c => c !== null);
    expect(successful.length).toBe(1);
    expect(successful[0]?.status).toBe('running');
  });

  it('Stale reclaim: expired claim reclaimable, fresh one not', async () => {
    await enqueue({ id: 'run-2', userId: 'u1', threadId: 't1', timings: {}, costSummary: {}, createdAt: new Date() });
    
    await collections.pipelineRuns.updateOne({ id: 'run-2' }, { $set: { status: 'running', claimedAt: new Date(Date.now() - 20000), workerId: 'w1' } });
    
    // Attempt to claim with cutoff 10s ago (which makes the 20s old one stale)
    const claimed = await claim('w2', new Date(Date.now() - 10000));
    expect(claimed?.workerId).toBe('w2');

    // Attempt to claim immediately again
    const claimed2 = await claim('w3', new Date(Date.now() - 10000));
    expect(claimed2).toBeNull();
  });

  it('Heartbeat fails after run was reclaimed', async () => {
    await enqueue({ id: 'run-3', userId: 'u1', threadId: 't1', timings: {}, costSummary: {}, createdAt: new Date() });
    await collections.pipelineRuns.updateOne({ id: 'run-3' }, { $set: { status: 'running', claimedAt: new Date(Date.now() - 20000), workerId: 'w1' } });
    
    // w2 reclaims
    await claim('w2', new Date(Date.now() - 10000));
    
    // w1 heartbeats -> should fail
    await expect(heartbeat('run-3', 'w1')).rejects.toThrow();
  });

  it('Illegal transition completed -> running rejected', async () => {
    await enqueue({ id: 'run-4', userId: 'u1', threadId: 't1', timings: {}, costSummary: {}, createdAt: new Date() });
    await claim('w1', new Date());
    await complete('run-4', 'w1');
    
    // Should not be claimable again
    const c = await claim('w2', new Date());
    expect(c).toBeNull();
  });

  it('Migration idempotence', async () => {
    await runMigrations(); // first run is in beforeEach
    const indexes1 = await collections.pipelineRuns.indexes();
    
    await runMigrations(); // second run
    const indexes2 = await collections.pipelineRuns.indexes();
    
    expect(indexes1.length).toBe(indexes2.length);
  });

  it('TTL index exists', async () => {
    const indexes = await collections.researchCache.indexes();
    const ttlIndex = indexes.find(i => i.expireAfterSeconds !== undefined);
    expect(ttlIndex).toBeDefined();
  });

  it('Ledger concurrency', async () => {
    const ledger = new MongoUsageLedger();
    await Promise.all(
      Array.from({ length: 50 }).map(() => ledger.recordUsage('u1', 1, 0, 0))
    );
    const day = new Date().toISOString().split('T')[0];
    const usage = await ledger.getDailyUsage('u1', day);
    expect(usage.tokens).toBe(50);
  });
  
  it('Port conformance logic - basic', async () => {
    const cache = new MongoResearchCache();
    await cache.set('hash', { a: 1 }, 10);
    const v = await cache.get('hash');
    expect(v.a).toBe(1);
  });
});
`);

console.log('Stage 2 files written.');
