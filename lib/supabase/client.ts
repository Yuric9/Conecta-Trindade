import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidAnonKey(value: string | undefined): boolean {
  return Boolean(value && value.length > 20 && !value.includes('sua-') && !value.includes('demo-'));
}

export const isSupabaseConfigured = isValidHttpUrl(rawUrl) && isValidAnonKey(rawKey);
export const STORAGE_BUCKET = 'chamados-fotos';

if (!isSupabaseConfigured && process.env.NODE_ENV === 'production') {
  console.error('[Conecta Trindade] Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// O placeholder nunca é usado como credencial: qualquer operação real exige isSupabaseConfigured.
const clientUrl = isSupabaseConfigured ? rawUrl! : 'https://supabase-not-configured.invalid';
const clientKey = isSupabaseConfigured ? rawKey! : 'unconfigured-anon-key';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'conecta-trindade-auth',
    flowType: 'pkce',
  },
});

// Helpers locais preservados apenas para compatibilidade de componentes legados.
// Não existem seeds, credenciais ou dados fictícios; em produção, o Supabase é a fonte oficial.
function getLocalItems<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalItems<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(items));
}

export function getStoredProfiles(): any[] {
  return getLocalItems('conecta_trindade_profiles');
}

export function saveStoredProfile(profile: any): any[] {
  const current = getStoredProfiles();
  const index = current.findIndex(
    (item: any) => item.id === profile.id || (profile.email && item.email?.toLowerCase() === profile.email.toLowerCase())
  );
  const next = [...current];
  if (index >= 0) next[index] = { ...next[index], ...profile, updated_at: new Date().toISOString() };
  else next.unshift({ ...profile, created_at: profile.created_at || new Date().toISOString() });
  saveLocalItems('conecta_trindade_profiles', next);
  return next;
}

export function deleteStoredProfile(id: string): any[] {
  const next = getStoredProfiles().filter((item: any) => item.id !== id);
  saveLocalItems('conecta_trindade_profiles', next);
  return next;
}

export function getStoredChamadosList(): any[] {
  return getLocalItems('conecta_trindade_chamados');
}

export function saveStoredChamadoItem(chamado: any): any[] {
  const current = getStoredChamadosList();
  const index = current.findIndex((item: any) => item.id === chamado.id || item.protocolo === chamado.protocolo);
  const next = [...current];
  if (index >= 0) next[index] = { ...next[index], ...chamado, updated_at: new Date().toISOString() };
  else next.unshift({ ...chamado, created_at: chamado.created_at || new Date().toISOString() });
  saveLocalItems('conecta_trindade_chamados', next);
  return next;
}

export function deleteStoredChamadoItem(id: string): any[] {
  const next = getStoredChamadosList().filter((item: any) => item.id !== id);
  saveLocalItems('conecta_trindade_chamados', next);
  return next;
}
