/**
 * Consulta pública de chamados (por protocolo ou CPF).
 *
 * Qualquer visitante pode usar esta busca, então ela:
 *  - aceita só um protocolo válido ou um CPF completo (11 dígitos), sem
 *    buscas parciais, para não permitir "varrer" o banco;
 *  - nunca devolve CPF, telefone ou nome completo do cidadão (LGPD).
 */

import { supabase, isSupabaseConfigured, type ChamadoRow } from '@/lib/supabase';
import { getSharedChamadosMemory } from '@/lib/chamados-memory';

export interface ChamadoPublico {
  id: string;
  protocolo: string;
  nome_cidadao: string;
  categoria_servico: string;
  descricao: string;
  endereco: string;
  foto_url: string | null;
  status: string;
  /** Resposta da equipe para o cidadão (nunca as observações internas). */
  resposta_cidadao: string | null;
  created_at: string;
  updated_at: string;
}

export type TermoBusca = { tipo: 'protocolo'; valor: string } | { tipo: 'cpf'; valor: string };

// Ex.: TRIN-2026-7B4K, TRIN-2026-1001, OS-2026-0001
const PROTOCOLO_REGEX = /^[A-Z]{2,5}-\d{4}-[A-Z0-9]{3,8}$/;

export function normalizarTermoBusca(termo: string): TermoBusca | null {
  const limpo = termo.trim().toUpperCase();
  if (PROTOCOLO_REGEX.test(limpo)) {
    return { tipo: 'protocolo', valor: limpo };
  }
  if (/^[\d.\-\s]+$/.test(limpo)) {
    const digitos = limpo.replace(/\D/g, '');
    if (digitos.length === 11) return { tipo: 'cpf', valor: digitos };
  }
  return null;
}

function primeiroNome(nome: string | null | undefined): string {
  return (nome || '').trim().split(/\s+/)[0] || 'Munícipe';
}

function paraVisaoPublica(c: ChamadoRow): ChamadoPublico {
  return {
    id: c.id,
    protocolo: c.protocolo,
    nome_cidadao: primeiroNome(c.nome_cidadao),
    categoria_servico: c.categoria_servico,
    descricao: c.descricao,
    endereco: c.endereco,
    foto_url: c.foto_url,
    status: c.status,
    resposta_cidadao: (c as any).resposta_cidadao ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export async function buscarChamadosPublico(busca: TermoBusca): Promise<ChamadoPublico[]> {
  if (isSupabaseConfigured) {
    // Função SECURITY DEFINER criada na migration 20261002000001_campos_gestao_localizacao.sql
    const { data, error } = await (supabase as any).rpc('consultar_chamados_publico_v2', { termo: busca.valor });
    if (error) throw error;
    return ((data as any[]) || []).map((row) => ({
      id: row.id,
      protocolo: row.protocolo,
      nome_cidadao: row.primeiro_nome || 'Munícipe',
      categoria_servico: row.categoria_servico,
      descricao: row.descricao,
      endereco: row.endereco,
      foto_url: row.foto_url,
      status: row.status,
      resposta_cidadao: row.resposta_cidadao ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  // Modo demonstração
  const store = getSharedChamadosMemory();
  const encontrados =
    busca.tipo === 'protocolo'
      ? store.filter((c) => c.protocolo.toUpperCase() === busca.valor)
      : store.filter((c) => (c.cpf_cidadao || '').replace(/\D/g, '') === busca.valor);
  return encontrados.map(paraVisaoPublica);
}
