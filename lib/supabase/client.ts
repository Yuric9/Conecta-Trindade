import { createClient } from '@supabase/supabase-js';
import { ORGAOS_PUBLICOS_TRINDADE } from '@/lib/public-places';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidHttpUrl(string: string | undefined): boolean {
  if (!string || string === 'sua-url-do-supabase' || string.includes('example.supabase.co')) {
    return false;
  }
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const isValidKey = (key: string | undefined): boolean => {
  return Boolean(key && key !== 'sua-anon-key-do-supabase' && key !== 'demo-anon-key' && key.length > 20);
};

export const isSupabaseConfigured = isValidHttpUrl(rawUrl) && isValidKey(rawKey);

export const STORAGE_BUCKET = 'chamados-fotos';

// --- In-memory & LocalStorage Mock for Preview / Demo Mode ---
const DEMO_ADMIN_ID = 'demo-admin-trindade-001';
const DEMO_CITIZEN_ID = 'demo-cidadao-trindade-002';

export const ADMIN_CREDENTIALS = {
  email: 'yure-c@hotmail.com',
  password: 'YUre1990',
};

export interface ConectaProfile {
  id: string;
  email: string;
  nome: string;
  cpf: string;
  telefone: string;
  role: string;
  secretaria?: string;
  cargo?: string;
  status?: string;
  created_at: string;
}

const SEED_PROFILES: ConectaProfile[] = [
  {
    id: DEMO_ADMIN_ID,
    email: 'yure-c@hotmail.com',
    nome: 'Gestor Municipal (Admin Geral)',
    cpf: '000.000.000-01',
    telefone: '(62) 3506-7000',
    role: 'admin',
    secretaria: 'TODAS',
    cargo: 'Secretário / Administrador Geral',
    status: 'ativo',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'demo-admin-legacy',
    email: 'admin@trindade.go.gov.br',
    nome: 'Supervisão de TI Trindade',
    cpf: '000.000.000-02',
    telefone: '(62) 3506-7010',
    role: 'admin',
    secretaria: 'TODAS',
    cargo: 'Gerência de Sistemas e Tecnologia',
    status: 'ativo',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'demo-fiscal-001',
    email: 'marcos.fiscal@trindade.go.gov.br',
    nome: 'Marcos Vinícius Silva',
    cpf: '234.567.890-12',
    telefone: '(62) 99123-4567',
    role: 'fiscal',
    secretaria: 'SERVICOS_PUBLICOS',
    cargo: 'Fiscal de Posturas e Vias',
    status: 'ativo',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'demo-atendente-001',
    email: 'camila.protocolo@trindade.go.gov.br',
    nome: 'Camila Fernandes Lopes',
    cpf: '345.678.901-23',
    telefone: '(62) 98877-6655',
    role: 'atendente',
    secretaria: 'OBRAS',
    cargo: 'Atendente de Triagem e Protocolo',
    status: 'ativo',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'demo-gestor-obras',
    email: 'roberto.obras@trindade.go.gov.br',
    nome: 'Eng. Roberto Albuquerque',
    cpf: '456.789.012-34',
    telefone: '(62) 99234-5678',
    role: 'gestor',
    secretaria: 'OBRAS',
    cargo: 'Diretor de Pavimentação e Drenagem',
    status: 'ativo',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: DEMO_CITIZEN_ID,
    email: 'cidadao@trindade.go.gov.br',
    nome: 'Cidadão Exemplar de Trindade',
    cpf: '111.222.333-44',
    telefone: '(62) 98765-4321',
    role: 'cidadao',
    secretaria: null,
    cargo: 'Munícipe',
    status: 'ativo',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'cidadao-maysa',
    email: 'lucas.trindade@gmail.com',
    nome: 'Lucas Gabriel Moreira',
    cpf: '555.666.777-88',
    telefone: '(62) 98111-2233',
    role: 'cidadao',
    secretaria: null,
    cargo: 'Munícipe (Setor Maysa)',
    status: 'ativo',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const SEED_CHAMADOS = [
  {
    id: 'ch-001',
    protocolo: 'OS-2026-0001',
    cidadao_id: DEMO_CITIZEN_ID,
    categoria: 'ILUMINACAO',
    descricao: 'Poste com lâmpada queimada piscando há 3 noites na esquina da avenida.',
    latitude: -16.6521,
    longitude: -49.4892,
    endereco_texto: 'Av. Manoel Monteiro, Centro, Trindade - GO',
    fotos: ['https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=60'],
    status: 'EM_ANDAMENTO',
    secretaria: 'OBRAS',
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    sla_limite: new Date(Date.now() + 36 * 3600000).toISOString(),
  },
  {
    id: 'ch-002',
    protocolo: 'OS-2026-0002',
    cidadao_id: DEMO_CITIZEN_ID,
    categoria: 'BURACO',
    descricao: 'Buraco profundo na pista próximo à faixa de pedestres, risco de acidentes.',
    latitude: -16.6502,
    longitude: -49.4845,
    endereco_texto: 'Rua Dr. Irany Ferreira, Vila Pai Eterno, Trindade - GO',
    fotos: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60'],
    status: 'ABERTO',
    secretaria: 'OBRAS',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    sla_limite: new Date(Date.now() + 112 * 3600000).toISOString(),
  },
  {
    id: 'ch-003',
    protocolo: 'OS-2026-0003',
    cidadao_id: 'cidadao-outro-003',
    categoria: 'LIMPEZA',
    descricao: 'Entulho e restos de podas acumulados na calçada pública impedindo passagem.',
    latitude: -16.6438,
    longitude: -49.4795,
    endereco_texto: 'Rua 104, Setor Maysa, Trindade - GO',
    fotos: [],
    status: 'TRIADO',
    secretaria: 'LIMPEZA_URBANA',
    created_at: new Date(Date.now() - 20 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    sla_limite: new Date(Date.now() + 28 * 3600000).toISOString(),
  },
  {
    id: 'ch-004',
    protocolo: 'OS-2026-0004',
    cidadao_id: 'cidadao-outro-004',
    categoria: 'VAZAMENTO',
    descricao: 'Vazamento contínuo de água na rede pública em frente ao comércio local.',
    latitude: -16.6558,
    longitude: -49.4932,
    endereco_texto: 'Av. Raimundo de Aquino, Vila Santa Inês, Trindade - GO',
    fotos: [],
    status: 'RESOLVIDO',
    secretaria: 'SANEAMENTO',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    sla_limite: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'ch-005',
    protocolo: 'OS-2026-0005',
    cidadao_id: DEMO_CITIZEN_ID,
    categoria: 'PODAS',
    descricao: 'Galho de grande porte ameaçando rede elétrica na praça.',
    latitude: -16.6538,
    longitude: -49.4910,
    endereco_texto: 'Praça da Matriz, Santuário, Trindade - GO',
    fotos: [],
    status: 'EM_ANDAMENTO',
    secretaria: 'LIMPEZA_URBANA',
    created_at: new Date(Date.now() - 40 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    sla_limite: new Date(Date.now() + 128 * 3600000).toISOString(),
  },
];

function getStoredItems<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (key === 'conecta_trindade_chamados' && Array.isArray(parsed)) {
      let changed = false;
      const migrated = parsed.map((item: any) => {
        if (item && typeof item.protocolo === 'string' && item.protocolo.startsWith('TRN-')) {
          changed = true;
          return { ...item, protocolo: item.protocolo.replace(/^TRN-/, 'OS-') };
        }
        return item;
      });
      if (changed) {
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      }
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function saveStoredItems<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

const authListeners = new Set<(event: string, session: any) => void>();

const createMockSupabaseClient = () => {
  const getSessionFromStorage = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('conecta_trindade_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const setSessionToStorage = (session: any) => {
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem('conecta_trindade_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('conecta_trindade_session');
      }
    } catch {
      // ignore
    }
  };

  const createQueryBuilder = (table: string) => {
    const getFallback = () => {
      if (table === 'chamados') return SEED_CHAMADOS;
      if (table === 'orgaos') return ORGAOS_PUBLICOS_TRINDADE;
      return SEED_PROFILES;
    };

    let items: any[] = getStoredItems<any>('conecta_trindade_' + table, getFallback());
    let filtered = [...items];

    const builder: any = {
      select: (_cols?: string) => builder,
      eq: (column: string, value: any) => {
        filtered = filtered.filter((it: any) => it[column] === value);
        return builder;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        const asc = options?.ascending ?? true;
        filtered.sort((a: any, b: any) => {
          const valA = a[column];
          const valB = b[column];
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        });
        return builder;
      },
      limit: (n: number) => {
        filtered = filtered.slice(0, n);
        return builder;
      },
      insert: (newRecords: any[]) => {
        const stored = getStoredItems<any>('conecta_trindade_' + table, getFallback());
        const insertedList = newRecords.map((r, i) => ({
          id: r.id || `mock-${Date.now()}-${i}`,
          ...(table === 'chamados'
            ? {
                protocolo: r.protocolo || `OS-2026-${String(stored.length + i + 1).padStart(4, '0')}`,
              }
            : {}),
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
          ...r,
        }));
        const updated = [...insertedList, ...stored];
        saveStoredItems('conecta_trindade_' + table, updated);
        filtered = insertedList;
        return builder;
      },
      update: (patch: any) => {
        const updateBuilder: any = {
          eq: async (col: string, val: any) => {
            const stored = getStoredItems<any>('conecta_trindade_' + table, getFallback());
            const next = stored.map((item: any) => {
              if (item[col] === val) {
                return { ...item, ...patch, updated_at: new Date().toISOString() };
              }
              return item;
            });
            saveStoredItems('conecta_trindade_' + table, next);
            return { data: patch, error: null };
          },
        };
        return updateBuilder;
      },
      delete: () => {
        const deleteBuilder: any = {
          eq: async (col: string, val: any) => {
            const stored = getStoredItems<any>('conecta_trindade_' + table, getFallback());
            const next = stored.filter((item: any) => item[col] !== val);
            saveStoredItems('conecta_trindade_' + table, next);
            return { error: null };
          },
        };
        return deleteBuilder;
      },
      single: async () => {
        return { data: filtered[0] || null, error: null };
      },
      maybeSingle: async () => {
        return { data: filtered[0] || null, error: null };
      },
      then: (resolve: (val: any) => any, reject?: (err: any) => any) => {
        return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
      },
    };

    return builder;
  };

  const auth = {
    getSession: async () => {
      const current = getSessionFromStorage();
      return { data: { session: current }, error: null };
    },
    signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
      const emailLower = email.trim().toLowerCase();
      const isAdminEmail = emailLower === ADMIN_CREDENTIALS.email.toLowerCase() || emailLower.includes('admin');

      // Se for a conta do administrador principal, checar a senha configurada
      if (emailLower === ADMIN_CREDENTIALS.email.toLowerCase() && password && password !== ADMIN_CREDENTIALS.password) {
        return { data: { session: null, user: null }, error: { message: 'Credenciais inválidas. Verifique a senha digitada.' } };
      }

      const profiles = getStoredItems('conecta_trindade_profiles', SEED_PROFILES);
      let foundProfile = profiles.find((p: any) => p.email?.toLowerCase() === emailLower);

      if (!foundProfile) {
        foundProfile = {
          id: isAdminEmail ? DEMO_ADMIN_ID : `user-${Date.now()}`,
          email: email.trim(),
          nome: isAdminEmail ? 'Gestor Municipal (Admin)' : email.split('@')[0],
          cpf: '123.456.789-00',
          telefone: '(62) 99999-9999',
          role: isAdminEmail ? 'admin' : 'cidadao',
          created_at: new Date().toISOString(),
        };
        saveStoredItems('conecta_trindade_profiles', [foundProfile, ...profiles]);
      } else if (isAdminEmail && foundProfile.role !== 'admin') {
        foundProfile.role = 'admin';
        saveStoredItems('conecta_trindade_profiles', profiles);
      }

      const session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        user: {
          id: foundProfile.id,
          email: foundProfile.email || email,
          user_metadata: {
            nome: foundProfile.nome,
            cpf: foundProfile.cpf,
            telefone: foundProfile.telefone,
          },
        },
      };

      setSessionToStorage(session);
      authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { session, user: session.user }, error: null };
    },
    signUp: async ({ email, options }: { email: string; password?: string; options?: any }) => {
      const profiles = getStoredItems('conecta_trindade_profiles', SEED_PROFILES);
      const isAdmin = email.toLowerCase().includes('admin');
      const newId = `user-${Date.now()}`;
      const newProfile = {
        id: newId,
        email,
        nome: options?.data?.nome || email.split('@')[0],
        cpf: options?.data?.cpf || '000.000.000-00',
        telefone: options?.data?.telefone || '(62) 99999-9999',
        role: isAdmin ? 'admin' : 'cidadao',
        created_at: new Date().toISOString(),
      };
      saveStoredItems('conecta_trindade_profiles', [newProfile, ...profiles]);

      const session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        user: {
          id: newId,
          email,
          user_metadata: options?.data || {},
        },
      };

      setSessionToStorage(session);
      authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { session, user: session.user }, error: null };
    },
    signOut: async () => {
      setSessionToStorage(null);
      authListeners.forEach((cb) => cb('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
  };

  const storage = {
    from: (_bucket: string) => ({
      upload: async (_fileName: string, blob: Blob) => {
        return { data: { path: _fileName }, error: null };
      },
      getPublicUrl: (fileName: string) => ({
        data: {
          publicUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=60',
        },
      }),
    }),
  };

  return {
    auth,
    storage,
    from: (table: string) => createQueryBuilder(table),
  };
};

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl!, rawKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        storageKey: 'conecta-trindade-auth',
        flowType: 'implicit',
      },
    })
  : createMockSupabaseClient() as any;

export function getStoredProfiles(): any[] {
  return getStoredItems('conecta_trindade_profiles', SEED_PROFILES);
}

export function saveStoredProfile(profile: any): any[] {
  const current = getStoredProfiles();
  const index = current.findIndex(
    (p: any) =>
      p.id === profile.id ||
      (profile.email && p.email?.toLowerCase() === profile.email.toLowerCase())
  );
  let next: any[];
  if (index >= 0) {
    next = [...current];
    next[index] = { ...next[index], ...profile, updated_at: new Date().toISOString() };
  } else {
    next = [
      { ...profile, created_at: profile.created_at || new Date().toISOString() },
      ...current,
    ];
  }
  saveStoredItems('conecta_trindade_profiles', next);
  return next;
}

export function deleteStoredProfile(id: string): any[] {
  const current = getStoredProfiles();
  const next = current.filter((p: any) => p.id !== id);
  saveStoredItems('conecta_trindade_profiles', next);
  return next;
}

export function getStoredChamadosList(): any[] {
  return getStoredItems('conecta_trindade_chamados', SEED_CHAMADOS);
}

export function saveStoredChamadoItem(chamado: any): any[] {
  const current = getStoredChamadosList();
  const index = current.findIndex((c: any) => c.id === chamado.id);
  let next: any[];
  if (index >= 0) {
    next = [...current];
    next[index] = { ...next[index], ...chamado, updated_at: new Date().toISOString() };
  } else {
    next = [
      {
        ...chamado,
        protocolo: chamado.protocolo || `OS-2026-${String(current.length + 1).padStart(4, '0')}`,
        created_at: chamado.created_at || new Date().toISOString(),
      },
      ...current,
    ];
  }
  saveStoredItems('conecta_trindade_chamados', next);
  return next;
}

export function deleteStoredChamadoItem(id: string): any[] {
  const current = getStoredChamadosList();
  const next = current.filter((c: any) => c.id !== id);
  saveStoredItems('conecta_trindade_chamados', next);
  return next;
}

