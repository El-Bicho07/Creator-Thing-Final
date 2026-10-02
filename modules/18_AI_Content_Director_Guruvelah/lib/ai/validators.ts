import { BANNED_PHRASES } from '@/lib/prompts/base';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateHooksOutput(hooksOutput: any, platform: string): ValidationResult {
  const errors: string[] = [];

  if (!hooksOutput || !Array.isArray(hooksOutput.hooks) || hooksOutput.hooks.length !== 7) {
    errors.push('Hooks must contain exactly 7 items.');
    return { valid: false, errors };
  }

  const hookTexts = hooksOutput.hooks.map((h: any) => h.text?.trim().toLowerCase());
  const uniqueTexts = new Set(hookTexts);
  if (uniqueTexts.size < 7) {
    errors.push('Hooks must be unique without duplicate phrasing.');
  }

  hooksOutput.hooks.forEach((h: any, i: number) => {
    if (!h.text || h.text.trim().length === 0) {
      errors.push(`Hook #${i + 1} text is empty.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateScriptOutput(script: any, expectedKind: 'video' | 'text', durationSec?: number): ValidationResult {
  const errors: string[] = [];

  if (!script || script.kind !== expectedKind) {
    errors.push(`Script kind must be '${expectedKind}'.`);
    return { valid: false, errors };
  }

  if (expectedKind === 'video') {
    if (!Array.isArray(script.segments) || script.segments.length < 3) {
      errors.push('Video script must contain at least 3 segments.');
      return { valid: false, errors };
    }

    const phases = script.segments.map((s: any) => s.label);
    if (phases[0] !== 'HOOK') errors.push('First segment must be HOOK.');
    if (phases[phases.length - 1] !== 'CTA') errors.push('Last segment must be CTA.');

    if (durationSec) {
      const lastSegment = script.segments[script.segments.length - 1];
      if (lastSegment.endSec !== durationSec) {
        errors.push(`Video script endSec must equal requested duration (${durationSec}s).`);
      }
    }
  } else if (expectedKind === 'text') {
    if (script.assembledPost && script.assembledPost.length > 3500) {
      errors.push('Assembled post exceeds platform character capacity.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function checkForBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}
