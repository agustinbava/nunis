// Type declarations for platform-specific crypto modules
// Metro resolves crypto.web.ts or crypto.native.ts automatically
// This file serves as TypeScript fallback for type checking
export { deriveKey, encryptText, decryptText, generateKeyPair,
  encryptForRecipient, decryptFromSender, hashPassword,
} from './crypto.web';
