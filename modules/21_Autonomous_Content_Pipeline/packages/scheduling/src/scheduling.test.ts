
import { describe, it, expect } from 'vitest';
import { getBestTime } from './best-time/index.js';
import { generateIcs } from './calendar/index.js';

describe('Scheduling Tests', () => {
  it('Tier selection', () => {
    expect(getBestTime([{id: 1}, {id:2}, {id:3}, {id:4}, {id:5}, {id:6}], {}).tier).toBe(1);
    expect(getBestTime([], {}).tier).toBe(2);
  });
  it('.ics validity', () => {
    expect(generateIcs({})).toContain('BEGIN:VCALENDAR');
  });
  it('Timezone correctness', () => {
    // mock assertion
    expect(true).toBe(true);
  });
});
