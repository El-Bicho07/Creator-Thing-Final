import { z } from 'zod';
import { Plan, Artifact, CreatorProfile } from './entities.js';

export interface LlmRequest<T extends z.ZodType> {
  prompt: string;
  schema: T;
  temperature?: number;
  model?: string;
}

export interface LlmPort {
  generate<T extends z.ZodType>(request: LlmRequest<T>): Promise<z.infer<T>>;
  search(query: string): Promise<{ title: string; url: string; snippet: string }[]>;
}

export interface UsageLedgerPort {
  recordUsage(userId: string, tokens: number, estimatedUsd: number, quotaUnits: number): Promise<void>;
  getDailyUsage(userId: string, day: string): Promise<{ tokens: number; estimatedUsd: number; quotaUnits: number }>;
}

export interface ResearchCachePort {
  get(queryHash: string): Promise<any | null>;
  set(queryHash: string, data: any, ttlSeconds: number): Promise<void>;
}

export interface SkillRegistryPort {
  generateArtifact(format: string, plan: Plan): Promise<Artifact>;
}

export interface PublishingBundle {
  text: string;
  mediaUrls: string[];
}

export interface PublishingPort {
  publish(userId: string, platform: string, bundle: PublishingBundle): Promise<{ success: boolean; externalId?: string; error?: string }>;
}

export interface AgentClientPort {
  enqueueRun(userId: string, ideaId: string): Promise<string>;
  getRunStatus(runId: string): Promise<any>;
}

export interface ProfileMemoryPort {
  getProfile(userId: string): Promise<CreatorProfile | null>;
  updateProfile(userId: string, updates: Partial<CreatorProfile>): Promise<CreatorProfile>;
}

export class BudgetExceededError extends Error {
  public resetAt: Date;
  constructor(message: string, { resetAt }: { resetAt: Date }) {
    super(message);
    this.name = 'BudgetExceededError';
    this.resetAt = resetAt;
  }
}
