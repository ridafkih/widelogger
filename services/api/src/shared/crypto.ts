import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ConfigurationError } from "./errors";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new ConfigurationError(
      "ENCRYPTION_KEY environment variable is required for encryption"
    );
  }
  const keyBuffer = Buffer.from(key, "base64");
  if (keyBuffer.length !== 32) {
    throw new ConfigurationError(
      "ENCRYPTION_KEY must be a 32-byte key encoded as base64"
    );
  }
  return keyBuffer;
}

interface EncryptedData {
  encrypted: string;
  nonce: string;
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([encrypted, authTag]).toString("base64"),
    nonce: iv.toString("base64"),
  };
}

export function decrypt(encrypted: string, nonce: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(nonce, "base64");
  const encryptedBuffer = Buffer.from(encrypted, "base64");

  const authTag = encryptedBuffer.subarray(-AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(0, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
