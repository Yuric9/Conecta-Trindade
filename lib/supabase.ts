/**
 * Conecta-Trindade - Integração Oficial com Supabase
 * Arquivo: lib/supabase.ts
 * 
 * Gerencia a conexão com o banco de dados PostgreSQL via Supabase,
 * exportando o cliente fortemente tipado com o schema da tabela 'chamados'
 * (e o alias 'solicitacoes') e a verificação de conexão.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =====================================================================
// 1. Tipos e Enums do Banco de Dados Conecta-Trindade
// =====================================================================

export type StatusChamado =
  | 'Pendente'
  | 'Em Análise'
  | 'Na Secretaria'
  | 'Encaminhada'
  | 'Em Andamento'
  | 'Aguardando Confirmação'
  | 'Concluído'
  | 'Cancelado';

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
