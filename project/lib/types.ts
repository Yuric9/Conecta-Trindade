export type ChamadoCategoria = 'ILUMINACAO' | 'BURACO' | 'LIMPEZA' | 'VAZAMENTO' | 'PODAS' | 'OUTROS';
export type ChamadoStatus = 'ABERTO' | 'TRIADO' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'REJEITADO' | 'AVALIADO';
export type ChamadoSecretaria = 'OBRAS' | 'LIMPEZA_URBANA' | 'SANEAMENTO';

export interface Chamado {
  id: string;
  protocolo: string;
  cidadao_id: string;
  categoria: ChamadoCategoria;
  descricao: string;
  latitude: number;
  longitude: number;
  endereco_texto: string | null;
  fotos: string[];
  status: ChamadoStatus;
  secretaria: ChamadoSecretaria | null;
  created_at: string;
  updated_at: string;
  sla_limite: string | null;
}

export interface Profile {
  id: string;
  cpf: string;
  telefone: string | null;
  nome: string | null;
  role: 'cidadao' | 'admin';
  created_at: string;
}

export interface CategoriaInfo {
  id: ChamadoCategoria;
  label: string;
  icon: string;
  emoji: string;
  secretaria: ChamadoSecretaria;
  slaHours: number;
}

export interface StatusInfo {
  id: ChamadoStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  progress: number;
}

export const CATEGORIAS: CategoriaInfo[] = [
  { id: 'ILUMINACAO', label: 'Iluminação', icon: 'Lightbulb', emoji: '💡', secretaria: 'OBRAS', slaHours: 72 },
  { id: 'BURACO', label: 'Buraco', icon: 'Construction', emoji: '🕳️', secretaria: 'OBRAS', slaHours: 120 },
  { id: 'LIMPEZA', label: 'Limpeza', icon: 'Trash2', emoji: '🗑️', secretaria: 'LIMPEZA_URBANA', slaHours: 48 },
  { id: 'VAZAMENTO', label: 'Vazamento', icon: 'Droplet', emoji: '💧', secretaria: 'SANEAMENTO', slaHours: 24 },
  { id: 'PODAS', label: 'Podas', icon: 'TreePine', emoji: '🌳', secretaria: 'LIMPEZA_URBANA', slaHours: 168 },
  { id: 'OUTROS', label: 'Outros', icon: 'AlertCircle', emoji: '⚠️', secretaria: 'OBRAS', slaHours: 96 },
];

export const STATUS_MAP: Record<ChamadoStatus, StatusInfo> = {
  ABERTO: { id: 'ABERTO', label: 'Aberto', color: 'amber', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', textColor: 'text-amber-700', progress: 15 },
  TRIADO: { id: 'TRIADO', label: 'Triado', color: 'purple', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', textColor: 'text-purple-700', progress: 30 },
  EM_ANDAMENTO: { id: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', textColor: 'text-blue-700', progress: 60 },
  RESOLVIDO: { id: 'RESOLVIDO', label: 'Resolvido', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-300', textColor: 'text-green-700', progress: 90 },
  REJEITADO: { id: 'REJEITADO', label: 'Rejeitado', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-300', textColor: 'text-red-700', progress: 0 },
  AVALIADO: { id: 'AVALIADO', label: 'Avaliado', color: 'teal', bgColor: 'bg-teal-50', borderColor: 'border-teal-300', textColor: 'text-teal-700', progress: 100 },
};

export const SECRETARIAS: Record<ChamadoSecretaria, string> = {
  OBRAS: 'Secretaria de Obras',
  LIMPEZA_URBANA: 'Limpeza Urbana',
  SANEAMENTO: 'Saneamento',
};

export function getCategoriaInfo(cat: ChamadoCategoria): CategoriaInfo | undefined {
  return CATEGORIAS.find((c) => c.id === cat);
}

export function getStatusInfo(status: ChamadoStatus): StatusInfo {
  return STATUS_MAP[status];
}

export function formatProtocolo(protocolo: string): string {
  return protocolo;
}

export function formatData(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function tempoRelativo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const horas = Math.floor(diff / (1000 * 60 * 60));
  if (horas < 1) return 'agora mesmo';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias}d`;
  const meses = Math.floor(dias / 30);
  return `há ${meses}m`;
}
