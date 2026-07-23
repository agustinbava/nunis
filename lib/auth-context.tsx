import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { createUser, getUserById } from './database';
import { deriveKey, generateKeyPair, encryptText } from './crypto';
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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  encryptionKey: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura la sesión persistida al abrir la app.
  // Nota E2E: al restaurar no tenemos el password, así que encryptionKey queda
  // null hasta que el usuario vuelva a loguearse. Los campos encriptados
  // (notas/journal) se muestran bloqueados hasta entonces.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (uid) {
        const profile = await getUserById(uid).catch(() => null);
        if (mounted && profile) setUser(profile as User);
      }
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setEncryptionKey(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error || !data.user) {
        return { success: false, error: 'Email o contraseña incorrectos' };
      }
      const key = await deriveKey(password, data.user.id);
      const profile = await getUserById(data.user.id);
      if (!profile) return { success: false, error: 'No se encontró el perfil' };
      setEncryptionKey(key);
      setUser(profile as User);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: 'patient' | 'psychologist') => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { name, role } },
      });
      if (error) {
        const msg = /already registered/i.test(error.message)
          ? 'Ya existe una cuenta con este email'
          : error.message;
        return { success: false, error: msg };
      }
      if (!data.user) return { success: false, error: 'No se pudo crear la cuenta' };
      if (!data.session) {
        // Email confirmation está activada en Supabase. Para el prototipo hay que
        // desactivarla (Auth -> Providers -> Email -> Confirm email = off).
        return { success: false, error: 'Revisá tu email para confirmar la cuenta, o desactivá la confirmación de email en Supabase.' };
      }

      const id = data.user.id;
      const key = await deriveKey(password, id);
      const keyPair = generateKeyPair();
      const publicKeyB64 = naclUtil.encodeBase64(keyPair.publicKey);
      const privateKeyB64 = naclUtil.encodeBase64(keyPair.secretKey);
      const encryptedPrivateKey = encryptText(privateKeyB64, key);
      const shareCode = generateShareCode();

      // Completa el profile (creado por el trigger) con name/role/claves/share_code.
      await createUser(id, cleanEmail, '', name, role, shareCode, publicKeyB64, encryptedPrivateKey);

      const newUser = await getUserById(id);
      setEncryptionKey(key);
      setUser(newUser as User);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const logout = useCallback(async () => {
    // Limpiar el estado primero para que la UI cierre sesión al instante,
    // aunque el signOut de red tarde o falle.
    setUser(null);
    setEncryptionKey(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignorar: la sesión local ya se limpió
    }
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

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
