/**
 * O pedido visto pelo cidadão.
 *
 * O cidadão não vê as etapas internas (coordenador, confirmação da
 * Secretaria...). Ele vê 4 passos simples e um status resumido.
 */
import { normalizarStatusOS, statusParaCidadao } from '@/lib/os-status';

export type StatusCidadao = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

export const ROTULO_CIDADAO: Record<StatusCidadao, string> = {
  Pendente: 'Recebido',
  'Em Andamento': 'Em andamento',
  Concluído: 'Concluído',
  Cancelado: 'Cancelado',
};

export const COR_CIDADAO: Record<StatusCidadao, string> = {
  Pendente: 'bg-amber-50 text-amber-900 border-amber-300',
  'Em Andamento': 'bg-blue-50 text-blue-900 border-blue-300',
  Concluído: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  Cancelado: 'bg-gray-100 text-gray-700 border-gray-300',
};

/** Rótulo para o cidadão a partir do status do banco (ex.: "Com o coordenador" → "Em andamento"). */
export function rotuloStatusCidadao(status: string | null | undefined): string {
  return ROTULO_CIDADAO[statusParaCidadao(status)];
}

/** Campos que o cidadão recebe do banco para montar a linha do tempo */
export interface DatasPedido {
  status: string;
  created_at: string;
  na_secretaria_em?: string | null;
  encaminhado_em?: string | null;
  concluido_em?: string | null;
  updated_at?: string | null;
}

export interface EtapaCidadao {
  titulo: string;
  descricao: string;
  data: string | null;
  estado: 'feita' | 'atual' | 'futura';
}

/** Os 4 passos: Recebido → Na Secretaria → Equipe em campo → Concluído */
export function etapasDoPedido(p: DatasPedido): EtapaCidadao[] {
  const s = normalizarStatusOS(p.status);
  // Até onde o pedido chegou (0 a 3)
  const nivel =
    s === 'Concluído'
      ? 3
      : s === 'Encaminhada' || s === 'Em Andamento' || s === 'Aguardando Confirmação'
        ? 2
        : s === 'Na Secretaria'
          ? 1
          : 0;
  const passos: Omit<EtapaCidadao, 'estado'>[] = [
    {
      titulo: 'Recebido',
      descricao: 'Seu pedido chegou à Central de Atendimento da Prefeitura.',
      data: p.created_at,
    },
    {
      titulo: 'Na Secretaria',
      descricao: 'Analisado e enviado à Secretaria de Infraestrutura.',
      data: p.na_secretaria_em ?? null,
    },
    {
      titulo: 'Equipe em campo',
      descricao: 'Uma equipe foi designada para executar o serviço.',
      data: p.encaminhado_em ?? null,
    },
    {
      titulo: 'Concluído',
      descricao: 'Serviço executado e conferido pela Secretaria.',
      data: p.concluido_em ?? (s === 'Concluído' ? p.updated_at ?? null : null),
    },
  ];
  return passos.map((passo, i) => ({
    ...passo,
    // Datas de uma etapa futura não valem (ex.: O.S. que voltou para trás)
    data: i <= nivel ? passo.data : null,
    estado: i < nivel || (i === nivel && nivel === 3) ? 'feita' : i === nivel ? 'atual' : 'futura',
  }));
}
