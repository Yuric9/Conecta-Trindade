export type ChamadoStatus =
  | 'ABERTO'
  | 'TRIADO'
  | 'EM_ANDAMENTO'
  | 'RESOLVIDO'
  | 'CANCELADO'
  | 'REJEITADO'
  | 'AVALIADO'
  | 'Pendente'
  | 'Em Andamento'
  | 'Concluído';

export type ChamadoCategoria =
  | 'ILUMINACAO'
  | 'BURACO'
  | 'LIXO'
  | 'VAZAMENTO'
  | 'PODA'
  | 'ROCAGEM'
  | 'OUTROS';

export type ChamadoSecretaria =
  | 'OBRAS'
  | 'SERVICOS_PUBLICOS'
  | 'MEIO_AMBIENTE'
  | 'TRANSITO'
  | 'SAUDE'
  | 'EDUCACAO'
  | 'SEGURANCA';

export type UserRole = 'admin' | 'gestor' | 'fiscal' | 'atendente' | 'cidadao';

export interface Chamado {
  id: string;
  protocolo: string;
  cidadao_id?: string;
  cidadao_nome?: string;
  cidadao_telefone?: string;
  categoria: ChamadoCategoria;
  descricao: string;
  latitude: number;
  longitude: number;
  endereco_texto?: string;
  fotos: string[];
  status: ChamadoStatus;
  secretaria?: ChamadoSecretaria | null;
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  created_at: string;
  updated_at?: string;
  sla_limite?: string;
  observacoes_internas?: string;
  resposta_cidadao?: string;
}

export interface Profile {
  id: string;
  email: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  role: UserRole;
  secretaria?: ChamadoSecretaria | 'TODAS' | null;
  cargo?: string;
  status?: 'ativo' | 'inativo' | 'bloqueado';
  created_at: string;
  updated_at?: string;
}

export interface CategoriaItem {
  id: ChamadoCategoria;
  label: string;
  icon: string;
  emoji: string;
  cor: string;
  slaHoras: number;
  secretaria: ChamadoSecretaria;
}

export const CATEGORIAS: CategoriaItem[] = [
  {
    id: 'ILUMINACAO',
    label: 'Iluminação Pública',
    icon: 'Lightbulb',
    emoji: '💡',
    cor: '#eab308',
    slaHoras: 48,
    secretaria: 'OBRAS',
  },
  {
    id: 'BURACO',
    label: 'Buracos e Vias',
    icon: 'Construction',
    emoji: '🕳️',
    cor: '#f97316',
    slaHoras: 120,
    secretaria: 'OBRAS',
  },
  {
    id: 'LIXO',
    label: 'Lixo e Entulho',
    icon: 'Trash2',
    emoji: '🗑️',
    cor: '#ef4444',
    slaHoras: 72,
    secretaria: 'SERVICOS_PUBLICOS',
  },
  {
    id: 'VAZAMENTO',
    label: 'Vazamento de Água',
    icon: 'Droplet',
    emoji: '💧',
    cor: '#0ea5e9',
    slaHoras: 24,
    secretaria: 'SERVICOS_PUBLICOS',
  },
  {
    id: 'PODA',
    label: 'Poda e Árvores',
    icon: 'TreePine',
    emoji: '🌳',
    cor: '#10b981',
    slaHoras: 168,
    secretaria: 'MEIO_AMBIENTE',
  },
  {
    id: 'ROCAGEM',
    label: 'Roçagem e Capina',
    icon: 'Scissors',
    emoji: '🌾',
    cor: '#84cc16',
    slaHoras: 120,
    secretaria: 'SERVICOS_PUBLICOS',
  },
  {
    id: 'OUTROS',
    label: 'Outras Demandas',
    icon: 'AlertCircle',
    emoji: '⚠️',
    cor: '#8b5cf6',
    slaHoras: 120,
    secretaria: 'OBRAS',
  },
];

export const SECRETARIAS: Record<ChamadoSecretaria, string> = {
  OBRAS: 'Secretaria de Obras e Serviços Urbanos',
  SERVICOS_PUBLICOS: 'Secretaria de Serviços Públicos',
  MEIO_AMBIENTE: 'Secretaria de Meio Ambiente',
  TRANSITO: 'Superintendência Municipal de Trânsito',
  SAUDE: 'Secretaria Municipal de Saúde',
  EDUCACAO: 'Secretaria Municipal de Educação',
  SEGURANCA: 'Secretaria de Segurança Pública e Defesa Civil',
};

export const SLA_PADRAO_HORAS: Record<ChamadoCategoria, number> = {
  ILUMINACAO: 48,
  BURACO: 120,
  LIXO: 72,
  VAZAMENTO: 24,
  PODA: 168,
  ROCAGEM: 120,
  OUTROS: 120,
};

export interface StatusInfo {
  label: string;
  cor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeClass: string;
  progress: number;
}

export function getStatusInfo(status: ChamadoStatus): StatusInfo {
  switch (status) {
    case 'ABERTO':
      return {
        label: 'Aberto',
        cor: '#f59e0b',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        textColor: 'text-amber-800',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        progress: 20,
      };
    case 'TRIADO':
      return {
        label: 'Triado',
        cor: '#a855f7',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-800',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        progress: 45,
      };
    case 'EM_ANDAMENTO':
      return {
        label: 'Em Andamento',
        cor: '#3b82f6',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        progress: 70,
      };
    case 'RESOLVIDO':
      return {
        label: 'Resolvido',
        cor: '#10b981',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        textColor: 'text-emerald-800',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        progress: 100,
      };
    case 'AVALIADO':
      return {
        label: 'Avaliado',
        cor: '#059669',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        textColor: 'text-emerald-800',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        progress: 100,
      };
    case 'REJEITADO':
      return {
        label: 'Rejeitado',
        cor: '#ef4444',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        textColor: 'text-red-800',
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        progress: 100,
      };
    case 'CANCELADO':
      return {
        label: 'Cancelado',
        cor: '#6b7280',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        textColor: 'text-gray-800',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
        progress: 100,
      };
    default:
      return {
        label: status || 'Desconhecido',
        cor: '#9ca3af',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-700',
        badgeClass: 'bg-gray-100 text-gray-700',
        progress: 10,
      };
  }
}

export function normalizeCategoria(cat?: string | null): ChamadoCategoria {
  if (!cat) return 'OUTROS';
  const clean = cat.trim();
  const upper = clean.toUpperCase();

  if (
    upper === 'ROCAGEM' ||
    upper.includes('ROÇAGEM') ||
    upper.includes('ROCAGEM') ||
    upper.includes('CAPINA') ||
    upper.includes('MATO')
  ) {
    return 'ROCAGEM';
  }
  if (
    upper === 'ILUMINACAO' ||
    upper.includes('ILUMINA') ||
    upper.includes('LÂMPADA') ||
    upper.includes('LAMPADA') ||
    upper.includes('POSTE')
  ) {
    return 'ILUMINACAO';
  }
  if (
    upper === 'BURACO' ||
    upper.includes('BURACO') ||
    upper.includes('PAVIMENTA') ||
    upper.includes('ASFALT') ||
    upper.includes('TAPA-BURACO')
  ) {
    return 'BURACO';
  }
  if (
    upper === 'LIXO' ||
    upper.includes('LIXO') ||
    upper.includes('ENTULHO') ||
    upper.includes('LIMPEZA') ||
    upper.includes('DESCARTE')
  ) {
    return 'LIXO';
  }
  if (
    upper === 'VAZAMENTO' ||
    upper.includes('VAZAMENTO') ||
    upper.includes('ÁGUA') ||
    upper.includes('AGUA') ||
    upper.includes('ESGOTO') ||
    upper.includes('BUEIRO')
  ) {
    return 'VAZAMENTO';
  }
  if (
    upper === 'PODA' ||
    upper.includes('PODA') ||
    upper.includes('ÁRVORE') ||
    upper.includes('ARVORE') ||
    upper.includes('GALHO')
  ) {
    return 'PODA';
  }

  // Se já for exatamente uma chave de categoria
  const directMatch = CATEGORIAS.find(
    (c) => c.id === clean || c.label.toLowerCase() === clean.toLowerCase()
  );
  if (directMatch) return directMatch.id;

  return 'OUTROS';
}

export function getCategoriaInfo(categoria: ChamadoCategoria | string): CategoriaItem {
  const normId = normalizeCategoria(categoria);
  const found = CATEGORIAS.find((c) => c.id === normId);
  if (found) return found;

  return {
    id: 'OUTROS',
    label: typeof categoria === 'string' && categoria.trim() ? categoria : 'Outras Demandas',
    icon: 'AlertCircle',
    emoji: '⚠️',
    cor: '#8b5cf6',
    slaHoras: 120,
    secretaria: 'OBRAS',
  };
}

export function formatData(dataString?: string | null): string {
  if (!dataString) return '-';
  try {
    const d = new Date(dataString);
    if (isNaN(d.getTime())) return dataString;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataString;
  }
}

export function tempoRelativo(dataString?: string | null): string {
  if (!dataString) return '';
  try {
    const d = new Date(dataString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 2) return 'agora há pouco';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHoras === 1) return 'há 1 hora';
    if (diffHoras < 24) return `há ${diffHoras} horas`;
    if (diffDias === 1) return 'ontem';
    if (diffDias < 30) return `há ${diffDias} dias`;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}
