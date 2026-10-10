/**
 * Consulta pública de chamados (só pelo número do protocolo).
 *
 * Qualquer visitante pode usar esta busca, então ela:
 *  - aceita só um protocolo completo, sem buscas parciais, para não permitir
 *    "varrer" o banco. Não aceita CPF: como muitos CPFs já vazaram, quem
 *    soubesse o CPF de alguém veria os pedidos (e o endereço) da pessoa.
 *    O cidadão logado vê os próprios pedidos em "Meus Chamados";
 *  - nunca devolve CPF, telefone ou nome completo do cidadão (LGPD).
 */

import { supabase, isSupabaseConfigured, type ChamadoRow } from '@/lib/supabase';
import { getSharedChamadosMemory } from '@/lib/chamados-memory';
import { clienteAdminSupabase } from '@/lib/supabase/server-admin';
import { assinarFotosDaLista } from '@/lib/fotos-os';

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
  /** Datas das etapas, para a linha do tempo do cidadão */
  na_secretaria_em: string | null;
  encaminhado_em: string | null;
  concluido_em: string | null;
  /** Foto do serviço feito (só depois de concluída) */
  foto_execucao_url: string | null;
  created_at: string;
  updated_at: string;
}

export type TermoBusca = { tipo: 'protocolo'; valor: string };

/** Mensagem para quem tenta consultar pelo CPF */
export const MSG_SO_PROTOCOLO =
  'Por segurança, a consulta é só pelo número do protocolo. Perdeu o protocolo? Entre na sua conta em "Meus Chamados" ou ligue para a Central: (62) 3506-7000.';

/** O termo parece um CPF (11 dígitos)? */
export function pareceCpf(termo: string): boolean {
  return /^[\d.\-\s]+$/.test(termo.trim()) && termo.replace(/\D/g, '').length === 11;
}

// Ex.: TRIN-2026-7B4K, TRIN-2026-1001, OS-2026-0001
const PROTOCOLO_REGEX = /^[A-Z]{2,5}-\d{4}-[A-Z0-9]{3,8}$/;

export function normalizarTermoBusca(termo: string): TermoBusca | null {
  const limpo = termo.trim().toUpperCase();
  if (PROTOCOLO_REGEX.test(limpo)) {
    return { tipo: 'protocolo', valor: limpo };
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
    na_secretaria_em: (c as any).na_secretaria_em ?? null,
    encaminhado_em: (c as any).encaminhado_em ?? null,
    concluido_em: (c as any).concluido_em ?? null,
    foto_execucao_url: c.status === 'Concluído' ? (c as any).foto_execucao_url ?? null : null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export async function buscarChamadosPublico(busca: TermoBusca): Promise<ChamadoPublico[]> {
  if (isSupabaseConfigured) {
    // Função SECURITY DEFINER (migrations 20261010000001 e 20261010000003):
    // só pelo protocolo, com as datas das etapas
    const { data, error } = await (supabase as any).rpc('consultar_chamados_publico_v3', { termo: busca.valor });
    if (error) throw error;
    const lista: ChamadoPublico[] = ((data as any[]) || []).map((row) => ({
      id: row.id,
      protocolo: row.protocolo,
      nome_cidadao: row.primeiro_nome || 'Munícipe',
      categoria_servico: row.categoria_servico,
      descricao: row.descricao,
      endereco: row.endereco,
      foto_url: row.foto_url,
      status: row.status,
      resposta_cidadao: row.resposta_cidadao ?? null,
      na_secretaria_em: row.na_secretaria_em ?? null,
      encaminhado_em: row.encaminhado_em ?? null,
      concluido_em: row.concluido_em ?? null,
      foto_execucao_url: row.foto_execucao_url ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    // Fotos do Storage: o servidor gera o link temporário (o visitante não tem login)
    const admin = clienteAdminSupabase();
    return admin ? assinarFotosDaLista(admin, lista, ['foto_url', 'foto_execucao_url']) : lista;
  }

  // Modo demonstração
  const store = getSharedChamadosMemory();
  const encontrados = store.filter((c) => c.protocolo.toUpperCase() === busca.valor);
  return encontrados.map(paraVisaoPublica);
}
