import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'demo-anon-key';

const createNoopSupabaseClient = () => {
  const noopQuery = () => {
    const query: any = {
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    };
    return query;
  };

  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: {
        subscription: { unsubscribe: () => {} },
      },
    }),
  };

  const storage = {
    from: () => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  };

  return {
    auth,
    storage,
    from: () => noopQuery(),
  };
};

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        storageKey: 'conecta-trindade-auth',
        flowType: 'implicit',
      },
    })
  : createNoopSupabaseClient() as any;

export const STORAGE_BUCKET = 'chamados-fotos';
