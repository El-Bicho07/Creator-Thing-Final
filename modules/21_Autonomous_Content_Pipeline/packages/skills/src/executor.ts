
import { Skill } from './types.js';
import { LlmPort } from '@contentyou/schemas';

export async function executeSkillsSerially(
  llm: LlmPort, 
  skills: Skill<any>[], 
  context: any, 
  onProgress?: (info: any) => void
) {
  const results = [];
  for (const skill of skills) {
    try {
      const result = await llm.generate({ prompt: 'system: ' + JSON.stringify(context.plan), schema: skill.outputSchema }); // mock call for now
      if (onProgress) onProgress({ skillId: skill.id, status: 'success' });
      results.push({ format: skill.format, data: result });
    } catch (err) {
      if (onProgress) onProgress({ skillId: skill.id, status: 'failed', error: err });
      results.push({ format: skill.format, error: err });
    }
  }
  return results;
}
