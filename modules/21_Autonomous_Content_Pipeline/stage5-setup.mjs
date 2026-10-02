import fs from 'fs';
import path from 'path';

const out = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
};

const pkgPath = 'apps/agent/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = {
  ...pkg.dependencies,
  "@contentyou/schemas": "workspace:*",
  "@contentyou/ai": "workspace:*",
  "@contentyou/db": "workspace:*"
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

out('apps/agent/src/worker.ts', `
import fastify from 'fastify';

const server = fastify();

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

export const startWorker = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log('Worker listening on port 3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
`);

out('apps/agent/src/checkpointer.ts', `
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { MongoClient } from 'mongodb';

export function createCheckpointer(client: MongoClient) {
  return new MongoDBSaver({ client, dbName: 'contentyou_checkpoints' });
}
`);

out('apps/agent/src/graphs/plan/state.ts', `
export interface PlanState {
  idea: string;
  researchDocs: any[];
  plan: any;
  events: any[];
  reviewStatus: string;
}
`);

out('apps/agent/src/graphs/plan/nodes/critic.ts', `
export function planCritic(state: any) {
  // Enforce citations
  if (state.plan && state.plan.claims) {
    for (const claim of state.plan.claims) {
      if (!claim.citationIds || claim.citationIds.length === 0) {
        throw new Error("Citation missing for claim");
      }
    }
  }
  return state;
}
`);

out('apps/agent/src/agent.test.ts', `
import { describe, it, expect } from 'vitest';
import { planCritic } from './graphs/plan/nodes/critic.js';

describe('Agent Graph Tests', () => {
  it('Citation enforcement: uncited claim fails', () => {
    const state = { plan: { claims: [{ text: "No citation", citationIds: [] }] } };
    expect(() => planCritic(state)).toThrow("Citation missing");
  });
  
  it('Citation enforcement: cited claim passes', () => {
    const state = { plan: { claims: [{ text: "Cited", citationIds: ['doc1'] }] } };
    expect(() => planCritic(state)).not.toThrow();
  });
});
`);

console.log('Stage 5 setup complete.');
