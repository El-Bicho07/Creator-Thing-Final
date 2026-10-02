import fs from 'fs';
import path from 'path';

const out = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
};

out('apps/web/src/lib/auth/crypto.ts', `
import crypto from 'crypto';

// AES-256-GCM encryption
export function encryptToken(token: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  // Format: iv:authTag:encrypted
  return \`\${iv.toString('base64')}:\${authTag}:\${encrypted}\`;
}

export function decryptToken(encryptedString: string, keyBase64: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) throw new Error("Invalid format");
  
  const [ivBase64, authTagBase64, encrypted] = parts;
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
`);

out('apps/web/src/lib/auth/index.ts', `
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { MongoClient } from 'mongodb';

// We delay connection to runtime
let db: any = null;
export function getDb() {
  if (!db) {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth');
    db = client.db();
  }
  return db;
}

export const auth = betterAuth({
  database: mongodbAdapter(getDb()),
  emailAndPassword: { enabled: true }
});
`);

out('apps/web/src/app/api/auth/[...all]/route.ts', `
import { auth } from '../../../../lib/auth/index.js';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
`);

out('apps/web/src/middleware.ts', `
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/app')) {
     const session = request.cookies.get('better-auth.session_token');
     if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
     }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
`);

out('apps/web/src/auth.test.ts', `
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
`);

console.log('Stage 3 setup complete.');
