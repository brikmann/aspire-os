import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
  const hex = process.env.SESSION_ENCRYPTION_KEY;
  if (!hex) throw new Error('SESSION_ENCRYPTION_KEY is not set');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('SESSION_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return key;
}

// Returns base64(iv[12] || authTag[16] || ciphertext)
export function encryptToken(token: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const data = Buffer.from(encrypted, 'base64');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
