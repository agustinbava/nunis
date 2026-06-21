// Web-specific crypto implementation using Web Crypto API + tweetnacl
// No dependency on expo-crypto
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function deriveKey(password: string, salt: string): Promise<Uint8Array> {
  const data = password + ':' + salt;
  const hash = await sha256(data);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hash.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function encryptText(plaintext: string, key: Uint8Array): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(plaintext);
  const encrypted = nacl.secretbox(messageUint8, nonce, key);
  if (!encrypted) throw new Error('Encryption failed');
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  return naclUtil.encodeBase64(fullMessage);
}

export function decryptText(ciphertext: string, key: Uint8Array): string {
  const fullMessage = naclUtil.decodeBase64(ciphertext);
  const nonce = fullMessage.slice(0, nacl.secretbox.nonceLength);
  const message = fullMessage.slice(nacl.secretbox.nonceLength);
  const decrypted = nacl.secretbox.open(message, nonce, key);
  if (!decrypted) throw new Error('Decryption failed');
  return naclUtil.encodeUTF8(decrypted);
}

export function generateKeyPair() {
  return nacl.box.keyPair();
}

export function encryptForRecipient(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(plaintext);
  const encrypted = nacl.box(messageUint8, nonce, recipientPublicKey, senderSecretKey);
  if (!encrypted) throw new Error('Encryption failed');
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  return naclUtil.encodeBase64(fullMessage);
}

export function decryptFromSender(
  ciphertext: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  const fullMessage = naclUtil.decodeBase64(ciphertext);
  const nonce = fullMessage.slice(0, nacl.box.nonceLength);
  const message = fullMessage.slice(nacl.box.nonceLength);
  const decrypted = nacl.box.open(message, nonce, senderPublicKey, recipientSecretKey);
  if (!decrypted) throw new Error('Decryption failed');
  return naclUtil.encodeUTF8(decrypted);
}

export async function hashPassword(password: string): Promise<string> {
  return sha256(password + ':nunis-salt-v1');
}
