
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
}, 60000);

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
      Array.from({ length: 10 }).map((_, i) => claim(`worker-${i}`, new Date(Date.now() - 10000)))
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
