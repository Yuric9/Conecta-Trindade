/**
 * Conecta-Trindade - Integração Oficial com Supabase
 * Arquivo: lib/supabase.ts
 * 
 * Gerencia a conexão com o banco de dados PostgreSQL via Supabase,
 * exportando o cliente fortemente tipado com o schema da tabela 'chamados'
 * (e o alias 'solicitacoes'), além de utilitários de CRUD e verificação de conexão.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =====================================================================
// 1. Tipos e Enums do Banco de Dados Conecta-Trindade
// =====================================================================

export type StatusChamado = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

export interface ChamadoRow {
  id: string;
  protocolo: string;
  nome_cidadao: string;
  cpf_cidadao: string;
  telefone_cidadao: string;
  categoria_servico: string;
  descricao: string;
  endereco: string;
  foto_url: string | null;
  status: StatusChamado;
  created_at: string;
  updated_at: string;
}

export interface ChamadoInsert {
  id?: string;
  protocolo?: string;
  nome_cidadao: string;
  cpf_cidadao: string;
  telefone_cidadao: string;
  categoria_servico: string;
  descricao: string;
  endereco: string;
  foto_url?: string | null;
  status?: StatusChamado;
  created_at?: string;
  updated_at?: string;
}

export interface ChamadoUpdate {
  id?: string;
  protocolo?: string;
  nome_cidadao?: string;
  cpf_cidadao?: string;
  telefone_cidadao?: string;
  categoria_servico?: string;
  descricao?: string;
  endereco?: string;
  foto_url?: string | null;
  status?: StatusChamado;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      chamados: {
        Row: ChamadoRow;
        Insert: ChamadoInsert;
        Update: ChamadoUpdate;
        Relationships: [];
      };
      solicitacoes: {
        Row: ChamadoRow;
        Insert: ChamadoInsert;
        Update: ChamadoUpdate;
        Relationships: [];
      };
    };
    Views: {
      solicitacoes: {
        Row: ChamadoRow;
        Relationships: [];
      };
    };
    Functions: {
      gerar_protocolo_chamado: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      status_chamado: StatusChamado;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// =====================================================================
// 2. Leitura e Validação de Variáveis de Ambiente
// =====================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function isValidUrl(url: string): boolean {
  if (!url || url.includes('sua-url-do-supabase') || url.includes('example.supabase.co')) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidKey(key: string): boolean {
  return Boolean(
    key &&
    key !== 'sua-anon-key-do-supabase' &&
    key !== 'demo-anon-key' &&
    key.length > 20
  );
}

/** Indica se as credenciais do Supabase foram preenchidas corretamente no .env */
export const isSupabaseConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);

// =====================================================================
// 3. Inicialização Segura do Cliente Supabase
// =====================================================================

// Se não houver credenciais reais, inicializamos com valores placeholder seguros
// para evitar travamento em tempo de build/SSR.
const effectiveUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  effectiveUrl,
  effectiveKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// =====================================================================
// 4. Utilitários de Negócio para o Conecta-Trindade (CRUD)
// =====================================================================

/**
 * Gera um protocolo padronizado para Trindade-GO no formato:
 * TRIN-YYYY-XXXX (Ex: TRIN-2026-8349)
 */
export function gerarProtocoloTrindade(ano?: number): string {
  const year = ano || new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `TRIN-${year}-${randomDigits}`;
}

/**
 * Registra um novo chamado/solicitação na tabela 'chamados'.
 */
export async function criarChamado(dados: ChamadoInsert): Promise<{ data: ChamadoRow | null; error: any }> {
  const payload: ChamadoInsert = {
    ...dados,
    protocolo: dados.protocolo || gerarProtocoloTrindade(),
    status: dados.status || 'Pendente',
  };

  if (!isSupabaseConfigured) {
    // Modo Local / Demonstração (Fallback)
    const simulatedRow: ChamadoRow = {
      id: dados.id || `local-${Date.now()}`,
      protocolo: payload.protocolo!,
      nome_cidadao: payload.nome_cidadao,
      cpf_cidadao: payload.cpf_cidadao,
      telefone_cidadao: payload.telefone_cidadao,
      categoria_servico: payload.categoria_servico,
      descricao: payload.descricao,
      endereco: payload.endereco,
      foto_url: payload.foto_url || null,
      status: payload.status as StatusChamado,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { data: simulatedRow, error: null };
  }

  const { data, error } = await (supabase.from('chamados') as any)
    .insert(payload)
    .select()
    .single();

  return { data: data as ChamadoRow | null, error };
}

/**
 * Busca um chamado pelo seu número de protocolo único.
 */
export async function buscarChamadoPorProtocolo(protocolo: string): Promise<{ data: ChamadoRow | null; error: any }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  const { data, error } = await (supabase.from('chamados') as any)
    .select('*')
    .ilike('protocolo', protocolo.trim())
    .single();

  return { data: data as ChamadoRow | null, error };
}

/**
 * Lista os chamados filtrados por CPF do cidadão.
 */
export async function buscarChamadosPorCpf(cpf: string): Promise<{ data: ChamadoRow[]; error: any }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }

  const cleanCpf = cpf.replace(/\D/g, '');
  const { data, error } = await (supabase.from('chamados') as any)
    .select('*')
    .or(`cpf_cidadao.eq.${cpf},cpf_cidadao.ilike.%${cleanCpf}%`)
    .order('created_at', { ascending: false });

  return { data: (data as ChamadoRow[]) || [], error };
}

/**
 * Atualiza o status operacional de um chamado (restrito ao painel administrativo).
 */
export async function atualizarStatusChamado(
  id: string,
  status: StatusChamado
): Promise<{ data: ChamadoRow | null; error: any }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  const updatePayload: ChamadoUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase.from('chamados') as any)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  return { data: data as ChamadoRow | null, error };
}
