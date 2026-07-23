// Type fallback para TypeScript. Metro resuelve database.web.ts / database.native.ts,
// que a su vez re-exportan database.supabase.ts (misma implementación en todas las plataformas).
export * from './database.supabase';
