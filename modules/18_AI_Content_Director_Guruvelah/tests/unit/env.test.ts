import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getEnvStatus, isConfigured } from '@/lib/utils/env';

describe('Lazy Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return false for missing keys when no env vars are set', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.GEMINI_API_KEY;

    const status = getEnvStatus();
    expect(status.supabase).toBe(false);
    expect(status.ai).toBe(false);
    expect(isConfigured()).toBe(false);
  });

  it('should return true for configured keys when env vars are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const status = getEnvStatus();
    expect(status.supabase).toBe(true);
    expect(status.ai).toBe(true);
    expect(isConfigured()).toBe(true);
  });
});
