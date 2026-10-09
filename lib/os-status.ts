/**
 * Status da Ordem de Serviço: um lugar só para nome, cor e regras.
 *
 * Fluxo:
 *   Nova ──► Na Secretaria ──► Com o coordenador ──► Em execução ──► Aguardando confirmação ──► Concluída
 *   (central   (Secretaria de     (Secretaria escolhe)  (coordenador)   (coordenador terminou)      (Secretaria
 *    analisa)   Infraestrutura)                                                                    confirma)
 *   A central cancela O.S. nova (com motivo); a Secretaria devolve à central.
 *
 * Os valores são os mesmos do enum `status_chamado` no banco; o que muda
 * é só o nome mostrado na tela (`label`).
 */

export type StatusOS =
  | 'Pendente'
  | 'Na Secretaria'
  | 'Encaminhada'
  | 'Em Andamento'
  | 'Aguardando Confirmação'
  | 'Concluído'
  | 'Cancelado';

export interface StatusOSInfo {
  label: string;
  /** Cor do pino no mapa e de gráficos */
  cor: string;
  /** Bolinha da legenda (classe Tailwind) */
  dot: string;
  /** Badge (classes Tailwind) */
  badge: string;
}

export const STATUS_OS: StatusOS[] = [
  'Pendente',
  'Na Secretaria',
  'Encaminhada',
  'Em Andamento',
  'Aguardando Confirmação',
  'Concluído',
  'Cancelado',
];

export const STATUS_OS_INFO: Record<StatusOS, StatusOSInfo> = {
  Pendente: {
    label: 'Nova',
    cor: '#d97706',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  'Na Secretaria': {
    label: 'Na Secretaria',
    cor: '#4f46e5',
    dot: 'bg-indigo-600',
    badge: 'bg-indigo-50 text-indigo-900 border-indigo-300',
  },
  Encaminhada: {
    label: 'Com o coordenador',
    cor: '#7c3aed',
    dot: 'bg-violet-600',
    badge: 'bg-violet-50 text-violet-900 border-violet-300',
  },
  'Em Andamento': {
    label: 'Em execução',
    cor: '#2563eb',
    dot: 'bg-blue-600',
    badge: 'bg-blue-50 text-blue-900 border-blue-300',
  },
  'Aguardando Confirmação': {
    label: 'Aguardando confirmação',
    cor: '#0891b2',
    dot: 'bg-cyan-600',
    badge: 'bg-cyan-50 text-cyan-900 border-cyan-300',
  },
  'Concluído': {
    label: 'Concluída',
    cor: '#059669',
    dot: 'bg-emerald-600',
    badge: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  },
  Cancelado: {
    label: 'Cancelada',
    cor: '#6b7280',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700 border-gray-300',
  },
};

/** Etapas em que a O.S. precisa ter um coordenador responsável. */
export const STATUS_COM_COORDENADOR: StatusOS[] = ['Encaminhada', 'Em Andamento', 'Aguardando Confirmação'];

/** Aceita os nomes do banco e os códigos antigos (ABERTO, TRIADO, RESOLVIDO...). */
export function normalizarStatusOS(status: string | null | undefined): StatusOS {
  const s = (status || '').toUpperCase().trim();
  switch (s) {
    case 'NA SECRETARIA':
      return 'Na Secretaria';
    case 'ENCAMINHADA':
      return 'Encaminhada';
    case 'EM ANDAMENTO':
    case 'EM_ANDAMENTO':
      return 'Em Andamento';
    case 'AGUARDANDO CONFIRMAÇÃO':
    case 'AGUARDANDO CONFIRMACAO':
      return 'Aguardando Confirmação';
    case 'CONCLUÍDO':
    case 'CONCLUIDO':
    case 'RESOLVIDO':
    case 'AVALIADO':
      return 'Concluído';
    case 'CANCELADO':
    case 'REJEITADO':
      return 'Cancelado';
    // PENDENTE, ABERTO, TRIADO e "Em Análise" (que saiu do fluxo)
    default:
      return 'Pendente';
  }
}

export function infoStatusOS(status: string | null | undefined): StatusOSInfo {
  return STATUS_OS_INFO[normalizarStatusOS(status)];
}

/** Ainda não terminou (nem concluída nem cancelada). */
export function osEmAberto(status: string | null | undefined): boolean {
  const s = normalizarStatusOS(status);
  return s !== 'Concluído' && s !== 'Cancelado';
}

export function prazoVencido(os: { status?: string | null; sla_limite?: string | null }): boolean {
  return Boolean(os.sla_limite && new Date(os.sla_limite) < new Date() && osEmAberto(os.status));
}

/** Para o cidadão a O.S. está "em andamento" desde que saiu da fila até a confirmação. */
export function statusParaCidadao(status: string | null | undefined): 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado' {
  const s = normalizarStatusOS(status);
  if (s === 'Pendente' || s === 'Concluído' || s === 'Cancelado') return s;
  return 'Em Andamento';
}

// ---------------------------------------------------------------------
// Papéis no fluxo (as mesmas regras do gatilho chamado_fluxo_os no banco)
// ---------------------------------------------------------------------

/**
 * admin: tudo · central: analisa e envia à Secretaria (ou cancela) ·
 * secretaria: escolhe o coordenador e confirma · coordenador: executa
 */
export type PapelOS = 'admin' | 'central' | 'secretaria' | 'coordenador';

export function papelOS(
  perfil: { role?: string | null; secretaria?: string | null; status?: string | null } | null | undefined
): PapelOS | null {
  if (!perfil || (perfil.status && perfil.status !== 'ativo')) return null;
  switch (perfil.role) {
    case 'admin':
      return 'admin';
    case 'coordenador':
      return 'coordenador';
    case 'gestor':
      return 'secretaria';
    case 'atendente':
    case 'fiscal':
      return perfil.secretaria === 'INFRAESTRUTURA' ? 'secretaria' : 'central';
    default:
      return null;
  }
}

export const NOME_PAPEL: Record<PapelOS, string> = {
  admin: 'Administração',
  central: 'Central de atendimento',
  secretaria: 'Secretaria de Infraestrutura',
  coordenador: 'Coordenador',
};

const PASSOS: Record<Exclude<PapelOS, 'admin'>, string[]> = {
  central: ['Pendente > Na Secretaria', 'Pendente > Cancelado'],
  secretaria: [
    'Na Secretaria > Encaminhada',
    'Na Secretaria > Pendente',
    'Encaminhada > Em Andamento',
    'Encaminhada > Aguardando Confirmação',
    'Em Andamento > Aguardando Confirmação',
    'Aguardando Confirmação > Concluído',
    'Aguardando Confirmação > Em Andamento',
    'Encaminhada > Na Secretaria',
    'Em Andamento > Na Secretaria',
  ],
  coordenador: [
    'Encaminhada > Em Andamento',
    'Encaminhada > Aguardando Confirmação',
    'Em Andamento > Aguardando Confirmação',
    'Encaminhada > Na Secretaria',
    'Em Andamento > Na Secretaria',
  ],
};

/** O papel pode levar a O.S. de `de` para `para`? */
export function podeMudarStatus(papel: PapelOS | null, de: StatusOS, para: StatusOS): boolean {
  if (de === para) return true;
  if (!papel) return false;
  if (papel === 'admin') return true;
  return PASSOS[papel].includes(`${de} > ${para}`);
}

/** Passos que precisam de explicação (o banco recusa sem motivo). */
export function motivoObrigatorio(de: StatusOS, para: StatusOS): string | null {
  if (de === para) return null;
  if (para === 'Cancelado') return 'Motivo do cancelamento';
  if (de === 'Na Secretaria' && para === 'Pendente') return 'Por que está voltando para a central';
  if (de === 'Aguardando Confirmação' && para === 'Em Andamento') return 'Por que a execução não foi aceita';
  if (para === 'Na Secretaria' && (de === 'Encaminhada' || de === 'Em Andamento')) return 'Por que está saindo do coordenador';
  return null;
}
