
import { describe, it, expect } from 'vitest';
import { reelDurationValidator, fabricatedStatisticValidator } from './validators/index.js';

describe('Skill Validators', () => {
  it('Reel duration validator rejects 3s and 120s, accepts 30s', () => {
    expect(reelDurationValidator.validate({ durationSeconds: 3 })).not.toBeNull();
    expect(reelDurationValidator.validate({ durationSeconds: 120 })).not.toBeNull();
    expect(reelDurationValidator.validate({ durationSeconds: 30 })).toBeNull();
  });

  it('Fabricated-statistic guard catches % without provenance', () => {
    expect(fabricatedStatisticValidator.validate({ content: "Engagement rose 340%", provenance: { planClaimIds: [] } })).not.toBeNull();
    expect(fabricatedStatisticValidator.validate({ content: "Engagement rose 340%", provenance: { planClaimIds: ['123'] } })).toBeNull();
  });
});
