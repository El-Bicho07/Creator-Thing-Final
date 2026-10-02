import { z } from 'zod';
import { LlmPort, LlmRequest, UsageLedgerPort, ResearchCachePort, SkillRegistryPort, PublishingPort, AgentClientPort, ProfileMemoryPort, PublishingBundle } from './ports.js';
import { Artifact, Plan, CreatorProfile } from './entities.js';

export class MockLlmPort implements LlmPort {
  public calls: LlmRequest<any>[] = [];
  async generate<T extends z.ZodType>(request: LlmRequest<T>): Promise<z.infer<T>> {
    this.calls.push(request);
    if (this.nextResult) {
      return this.nextResult;
    }
    throw new Error("MockLlmPort nextResult not set");
  }
  async search(query: string) {
    return [];
  }
  public nextResult: any;
}

export class MockUsageLedgerPort implements UsageLedgerPort {
  public records: any[] = [];
  async recordUsage(userId: string, tokens: number, estimatedUsd: number, quotaUnits: number): Promise<void> {
    this.records.push({ userId, tokens, estimatedUsd, quotaUnits });
  }
  async getDailyUsage(userId: string, day: string): Promise<{ tokens: number; estimatedUsd: number; quotaUnits: number }> {
    return { tokens: 100, estimatedUsd: 0.01, quotaUnits: 1 };
  }
}

export class MockResearchCachePort implements ResearchCachePort {
  public cache = new Map<string, any>();
  async get(queryHash: string): Promise<any | null> {
    return this.cache.get(queryHash) || null;
  }
  async set(queryHash: string, data: any, ttlSeconds: number): Promise<void> {
    this.cache.set(queryHash, data);
  }
}

export class MockSkillRegistryPort implements SkillRegistryPort {
  public calls: { format: string; plan: Plan }[] = [];
  public nextArtifact!: Artifact;
  async generateArtifact(format: string, plan: Plan): Promise<Artifact> {
    this.calls.push({ format, plan });
    return this.nextArtifact;
  }
}

export class MockPublishingPort implements PublishingPort {
  public calls: { userId: string; platform: string; bundle: PublishingBundle }[] = [];
  async publish(userId: string, platform: string, bundle: PublishingBundle) {
    this.calls.push({ userId, platform, bundle });
    return { success: true, externalId: 'mock-id' };
  }
}

export class MockAgentClientPort implements AgentClientPort {
  async enqueueRun(userId: string, ideaId: string): Promise<string> {
    return 'mock-run-id';
  }
  async getRunStatus(runId: string): Promise<any> {
    return { status: 'running' };
  }
}

export class MockProfileMemoryPort implements ProfileMemoryPort {
  public profile: CreatorProfile | null = null;
  async getProfile(userId: string): Promise<CreatorProfile | null> {
    return this.profile;
  }
  async updateProfile(userId: string, updates: Partial<CreatorProfile>): Promise<CreatorProfile> {
    if (!this.profile) throw new Error("No profile");
    this.profile = { ...this.profile, ...updates };
    return this.profile;
  }
}
