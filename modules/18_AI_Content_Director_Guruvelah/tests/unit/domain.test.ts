import { describe, it, expect } from 'vitest';
import { allocateSegments } from '@/lib/domain/timing';
import { deriveShotList } from '@/lib/domain/shot-list';
import { getPlatformConfig } from '@/lib/domain/platforms';

describe('Domain Rules & Timing Skeleton', () => {
  it('allocates contiguous segments starting at 0 and ending at durationSec for 30s', () => {
    const slots = allocateSegments(30);
    expect(slots[0].label).toBe('HOOK');
    expect(slots[0].startSec).toBe(0);
    expect(slots[slots.length - 1].label).toBe('CTA');
    expect(slots[slots.length - 1].endSec).toBe(30);

    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startSec).toBe(slots[i - 1].endSec);
    }
  });

  it('derives shot list deterministically from video script segments', () => {
    const fakeScript = {
      kind: 'video',
      segments: [
        { label: 'HOOK', startSec: 0, endSec: 3, voiceover: 'Hook voice', visual: 'Face to camera', camera: 'MCU', bRoll: 'None' },
        { label: 'CTA', startSec: 27, endSec: 30, voiceover: 'CTA voice', visual: 'End screen', camera: 'CU', bRoll: 'Logo' },
      ],
    };

    const shotList = deriveShotList(fakeScript);
    expect(shotList).toHaveLength(2);
    expect(shotList[0].shotNumber).toBe(1);
    expect(shotList[0].visualDescription).toBe('Face to camera');
    expect(shotList[1].timeRange).toBe('27–30s');
  });

  it('returns correct platform configuration', () => {
    const reels = getPlatformConfig('Instagram Reels');
    expect(reels.kind).toBe('video');
    expect(reels.captionCharCap).toBe(2200);

    const linkedin = getPlatformConfig('LinkedIn');
    expect(linkedin.kind).toBe('text');
  });
});
