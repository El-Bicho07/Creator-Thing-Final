export type ScriptPhase = 'HOOK' | 'SETUP' | 'VALUE' | 'PAYOFF' | 'CTA';

export interface ScriptSlot {
  label: ScriptPhase;
  startSec: number;
  endSec: number;
  timeRangeLabel: string; // e.g. "0–3s"
}

export function allocateSegments(durationSec: number = 30): ScriptSlot[] {
  const dur = Math.max(15, durationSec);
  const hookEnd = dur <= 15 ? 2 : 3;
  const ctaDuration = dur <= 30 ? 3 : 5;
  const ctaStart = dur - ctaDuration;

  const middleTime = ctaStart - hookEnd;
  const setupDuration = Math.round(middleTime * 0.2);
  const payoffDuration = Math.round(middleTime * 0.25);
  const valueDurationTotal = middleTime - setupDuration - payoffDuration;

  const setupEnd = hookEnd + setupDuration;

  // Determine number of VALUE slots based on duration
  let valueSlotCount = 1;
  if (dur >= 45 && dur <= 60) valueSlotCount = 2;
  else if (dur === 90) valueSlotCount = 3;
  else if (dur >= 180) valueSlotCount = 4;

  const valueSlotDuration = Math.floor(valueDurationTotal / valueSlotCount);
  const slots: ScriptSlot[] = [];

  // HOOK
  slots.push({
    label: 'HOOK',
    startSec: 0,
    endSec: hookEnd,
    timeRangeLabel: `0–${hookEnd}s`,
  });

  // SETUP
  slots.push({
    label: 'SETUP',
    startSec: hookEnd,
    endSec: setupEnd,
    timeRangeLabel: `${hookEnd}–${setupEnd}s`,
  });

  // VALUE SLOTS
  let currentStart = setupEnd;
  for (let i = 0; i < valueSlotCount; i++) {
    const isLast = i === valueSlotCount - 1;
    const end = isLast
      ? setupEnd + valueDurationTotal
      : currentStart + valueSlotDuration;

    slots.push({
      label: 'VALUE',
      startSec: currentStart,
      endSec: end,
      timeRangeLabel: `${currentStart}–${end}s`,
    });
    currentStart = end;
  }

  // PAYOFF
  const payoffEnd = ctaStart;
  slots.push({
    label: 'PAYOFF',
    startSec: currentStart,
    endSec: payoffEnd,
    timeRangeLabel: `${currentStart}–${payoffEnd}s`,
  });

  // CTA
  slots.push({
    label: 'CTA',
    startSec: ctaStart,
    endSec: dur,
    timeRangeLabel: `${ctaStart}–${dur}s`,
  });

  return slots;
}
