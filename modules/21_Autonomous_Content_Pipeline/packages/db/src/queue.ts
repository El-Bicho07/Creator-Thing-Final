
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
