// Clientes Supabase com armazenamento de sessão isolado por área:
// - /admin*   -> adminSupabase  (storageKey própria)
// - /barber* / /barbeiro* -> barberSupabase (storageKey própria)
// - demais rotas (cliente) -> clientSupabase (storageKey padrão do projeto)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type AuthScope = 'admin' | 'barber' | 'client';

export function getAuthScope(pathname?: string): AuthScope {
  const raw =
    pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');
  const p = raw.toLowerCase();
  if (p === '/admin' || p.startsWith('/admin/')) return 'admin';
  if (p === '/barber' || p.startsWith('/barber/') || p === '/barbeiro' || p.startsWith('/barbeiro/')) {
    return 'barber';
  }
  return 'client';
}

// Fallback seguro: em iOS PWA, localStorage pode lançar SecurityError ou QuotaExceededError.
function createSafeStorage(): Storage {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return localStorage;
  } catch {
    const store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    } as Storage;
  }
}

const safeStorage = createSafeStorage();

export const clientSupabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const adminSupabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: safeStorage,
      storageKey: 'sb-delonbarber-admin-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const barberSupabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: safeStorage,
      storageKey: 'sb-delonbarber-barber-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export function getScopedSupabase(scope: AuthScope = getAuthScope()): SupabaseClient<Database> {
  if (scope === 'admin') return adminSupabase;
  if (scope === 'barber') return barberSupabase;
  return clientSupabase;
}

/**
 * Proxy dinâmico que seleciona automaticamente a sessão isolada de acordo com a rota atual.
 * Garante que entrar/sair no Admin nunca afete o Painel do Barbeiro ou o app do Cliente.
 */
export const supabase: SupabaseClient<Database> = new Proxy(clientSupabase, {
  get(_target, prop) {
    const active = getScopedSupabase();
    const value = Reflect.get(active, prop, active);
    return typeof value === 'function' ? value.bind(active) : value;
  },
});
