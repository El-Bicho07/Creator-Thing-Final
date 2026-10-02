import { describe, it, expect, vi } from 'vitest';
import { getCoreEnv } from './env/core.js';

describe('Config env', () => {
  it('Missing required env var exits naming that variable', () => {
    const originalEnv = process.env;
    process.env = {}; // Clear env
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    getCoreEnv();

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalled();
    const errorMessage = mockConsoleError.mock.calls[0][0];
    expect(errorMessage).toContain('APP_URL');
    expect(errorMessage).toContain('MONGODB_URI');

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    process.env = originalEnv;
  });
});
