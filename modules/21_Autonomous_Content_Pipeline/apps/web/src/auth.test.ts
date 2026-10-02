
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { encryptToken, decryptToken } from './lib/auth/crypto.js';

describe('Crypto Tests', () => {
  const testKey = crypto.randomBytes(32).toString('base64');
  
  it('Encryption round-trip test', () => {
    const token = 'my-secret-token-123';
    const encrypted = encryptToken(token, testKey);
    const decrypted = decryptToken(encrypted, testKey);
    expect(decrypted).toBe(token);
  });
  
  it('Tamper test throws', () => {
    const token = 'my-secret-token-123';
    const encrypted = encryptToken(token, testKey);
    const tampered = encrypted.substring(0, encrypted.length - 2) + 'AA';
    
    expect(() => decryptToken(tampered, testKey)).toThrow();
  });
});
