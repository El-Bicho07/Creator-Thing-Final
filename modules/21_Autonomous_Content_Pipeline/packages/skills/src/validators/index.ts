
import { Validator } from '../types.js';

export const reelDurationValidator: Validator = {
  id: 'reel-duration',
  validate(output: any) {
    if (output.durationSeconds < 5 || output.durationSeconds > 90) {
      return "Reel duration must be between 5 and 90 seconds.";
    }
    return null;
  }
};

export const fabricatedStatisticValidator: Validator = {
  id: 'fabricated-stat',
  validate(output: any) {
    const text = JSON.stringify(output);
    const hasNumbers = /\d+%/.test(text);
    if (hasNumbers && (!output.provenance || output.provenance.planClaimIds.length === 0)) {
      return "Found numeric claims without backing planClaimIds.";
    }
    return null;
  }
};
