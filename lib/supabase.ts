import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type StatusChamado = 'Pendente' | 'Em Análise' | 'Em Andamento' | 'Concluído' | 'Cancelado';

export interface ChamadoRow {
  id: string;
  protocolo: string;
  cidadao_id: string | null;
  nome_cidadao: string;
  cpf_cidadao: string;
  telefone_cidadao: string;
  categoria_servico: string;
  descricao: string;
  endereco: string;
  foto_url: string | null;
  status: StatusChamado;
  observacoes_internas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChamadoInsert {
  id?: string;
  cidadao_id?: string | null;
  nome_cidadao: string;
  cpf_cidadao: string;
  telefone_cidadao: string;
  categoria_servico: string;
  descricao: string;
  endereco: string;
  foto_url?: string | null;
  status?: StatusChamado;
  observacoes_internas?: string | null;
}

export interface ChamadoUpdate {
  nome_cidadao?: string;
  cpf_cidadao?: string;
  telefone_cidadao?: string;
  categoria_servico?: string;
  descricao?: string;
  endereco?: string;
  foto_url?: string | null;
  status?: StatusChamado;
  observacoes_internas?: string | null;
}

export interface ProfileRow {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  role: 'admin' | 'servidor' | 'fiscal' | 'gestor' | 'atendente' | 'cidadao';
  secretaria: string | null;
  cargo: string | null;
  status: 'ativo' | 'inativo' | 'bloqueado';
  created_at: string;
  updated_at: string;
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
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      portal_config: {
        Row: { id: number; menu_contexto_cards_ativo: boolean; updated_at: string };
        Insert: { id?: number; menu_contexto_cards_ativo: boolean; updated_at?: string };
        Update: Partial<{ menu_contexto_cards_ativo: boolean; updated_at: string }>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consultar_chamado_publico: {
        Args: { p_protocolo: string };
        Returns: Array<{ protocolo: string; categoria_servico: string; descricao: string; status: string; created_at: string; updated_at: string }>;
      };
      consultar_chamado_publico_por_id: {
        Args: { p_id: string };
        Returns: Array<{ id: string; protocolo: string; status: string; created_at: string }>;
      };
      consultar_meus_chamados_por_cpf: {
        Args: { p_cpf: string };
        Returns: Array<{ id: string; protocolo: string; categoria_servico: string; descricao: string; status: string; created_at: string; updated_at: string }>;
      };
    };
    Enums: {
      status_chamado: StatusChamado;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function configured(): boolean {
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && key.length > 20;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = configured();

const clientUrl = isSupabaseConfigured ? url! : 'https://supabase-not-configured.invalid';
const clientKey = isSupabaseConfigured ? key! : 'unconfigured-anon-key';

export const supabase: SupabaseClient<Database> = createClient<Database>(clientUrl, clientKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
