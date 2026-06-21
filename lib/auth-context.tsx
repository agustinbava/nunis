import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createUser, getUserByEmail, getUserById } from './database';
import { hashPassword, deriveKey, generateKeyPair, encryptText, decryptText } from './crypto';
import naclUtil from 'tweetnacl-util';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'psychologist';
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_bg: string;
  theme_card: string;
  theme_text: string;
  personality: string;
  share_code: string;
  public_key: string;
}

interface AuthContextType {
  user: User | null;
  encryptionKey: Uint8Array | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, role: 'patient' | 'psychologist') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  encryptionKey: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const hash = await hashPassword(password);
      const found = await getUserByEmail(email.toLowerCase().trim());
      if (!found || found.password_hash !== hash) {
        return { success: false, error: 'Email o contraseña incorrectos' };
      }
      const key = await deriveKey(password, found.id);
      setEncryptionKey(key);
      setUser(found as User);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: 'patient' | 'psychologist') => {
    try {
      const existing = await getUserByEmail(email.toLowerCase().trim());
      if (existing) {
        return { success: false, error: 'Ya existe una cuenta con este email' };
      }

      const id = generateId();
      const hash = await hashPassword(password);
      const key = await deriveKey(password, id);
      const keyPair = generateKeyPair();
      const publicKeyB64 = naclUtil.encodeBase64(keyPair.publicKey);
      const privateKeyB64 = naclUtil.encodeBase64(keyPair.secretKey);
      const encryptedPrivateKey = encryptText(privateKeyB64, key);
      const shareCode = generateShareCode();

      await createUser(id, email.toLowerCase().trim(), hash, name, role, shareCode, publicKeyB64, encryptedPrivateKey);

      const newUser = await getUserById(id);
      setEncryptionKey(key);
      setUser(newUser as User);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setEncryptionKey(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const updated = await getUserById(user.id);
    if (updated) setUser(updated as User);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, encryptionKey, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
