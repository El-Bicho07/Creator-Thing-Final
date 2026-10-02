import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { executePlanAgent } from './graphs/plan/index.js';
import { createAiClient } from '@contentyou/ai';

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: '*' });

fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

fastify.post('/plan', async (request, reply) => {
  const { idea } = request.body as { idea: string };
  const aiClient = createAiClient({ 
    usageLedger: { 
      recordUsage: async () => {}, 
      getDailyUsage: async () => ({ tokens: 0, estimatedUsd: 0, quotaUnits: 0 }) 
    },
    researchCache: { 
      get: async () => null, 
      set: async () => {} 
    },
    config: { geminiApiKey: process.env.GEMINI_API_KEY }
  });
  
  try {
    const plan = await executePlanAgent(idea, aiClient);
    return { success: true, plan };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ success: false, error: error.message });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
