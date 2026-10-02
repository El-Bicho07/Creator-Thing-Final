
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
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
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
