import { getCategoriaInfo, getStatusInfo, formatData } from './types';
import type { ChamadoCategoria, ChamadoStatus } from './types';

export interface WhatsAppChamadoData {
  protocolo: string;
  categoria: ChamadoCategoria | string;
  status?: ChamadoStatus | string;
  endereco?: string;
  descricao?: string;
  created_at?: string;
  secretariaNome?: string;
  resposta_cidadao?: string;
}

export function formatChamadoWhatsAppText(data: WhatsAppChamadoData): string {
  const catInfo = getCategoriaInfo(data.categoria);
  const statusInfo = data.status ? getStatusInfo(data.status as ChamadoStatus) : null;
  const dataFormatada = data.created_at ? formatData(data.created_at) : formatData(new Date().toISOString());

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const acompanhamentoUrl = origin ? `${origin}/meus-chamados` : 'Portal Zelo Urbano Trindade';

  const lines = [
    `🏛️ *PREFEITURA MUNICIPAL DE TRINDADE*`,
    `🌱 *Zelo Urbano - Comprovante de Solicitação*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *O.S. (Ordem de Serviço):* ${data.protocolo}`,
    `📌 *Categoria:* ${catInfo.emoji} ${catInfo.label}`,
    statusInfo ? `📊 *Status Atual:* ${statusInfo.label}` : '',
    data.secretariaNome ? `🏢 *Secretaria Responsável:* ${data.secretariaNome}` : '',
    data.endereco ? `📍 *Endereço:* ${data.endereco}` : '',
    data.descricao ? `📝 *Descrição:* ${data.descricao}` : '',
    `📅 *Registrado em:* ${dataFormatada}`,
  ];

  if (data.resposta_cidadao) {
    lines.push(`💬 *Resposta da Prefeitura:* ${data.resposta_cidadao}`);
  }

  lines.push(
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔍 Acompanhe a evolução pelo portal:`,
    acompanhamentoUrl,
    `\n_Trindade cuidando da nossa cidade._`
  );

  return lines.filter((line) => line !== '').join('\n');
}

export function shareViaWhatsApp(text: string) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

const PRIORIDADE_LABEL: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: '🟠 ALTA',
  URGENTE: '🔴 URGENTE',
};

export interface WhatsAppOSCoordenadorData {
  protocolo: string;
  categoria: ChamadoCategoria | string;
  coordenadorNome?: string;
  prioridade?: string;
  sla_limite?: string | null;
  endereco?: string;
  descricao?: string;
  cidadao_nome?: string;
  cidadao_telefone?: string;
  latitude?: number | null;
  longitude?: number | null;
  observacao?: string;
}

/** Mensagem direta para o coordenador executar o serviço (sem texto de propaganda). */
export function formatarOSParaCoordenador(data: WhatsAppOSCoordenadorData): string {
  const catInfo = getCategoriaInfo(data.categoria);
  const temPonto = Number.isFinite(data.latitude) && Number.isFinite(data.longitude);
  const primeiroNome = (data.coordenadorNome || '').trim().split(' ')[0];

  const lines = [
    primeiroNome ? `Olá, ${primeiroNome}! Nova O.S. para você:` : 'Nova O.S. encaminhada:',
    ``,
    `🔧 *O.S. ${data.protocolo}*`,
    `📌 *Serviço:* ${catInfo.label}`,
    data.prioridade ? `⚡ *Prioridade:* ${PRIORIDADE_LABEL[data.prioridade] || data.prioridade}` : '',
    data.sla_limite ? `⏰ *Prazo:* ${formatData(data.sla_limite)}` : '',
    data.endereco ? `📍 *Endereço:* ${data.endereco}` : '',
    temPonto ? `🗺️ *Mapa:* https://www.google.com/maps?q=${data.latitude},${data.longitude}` : '',
    data.descricao ? `📝 *Descrição:* ${data.descricao}` : '',
    data.cidadao_nome || data.cidadao_telefone
      ? `📞 *Cidadão:* ${[data.cidadao_nome, data.cidadao_telefone].filter(Boolean).join(' – ')}`
      : '',
    data.observacao ? `💬 *Observação:* ${data.observacao}` : '',
    ``,
    `_Prefeitura de Trindade – Secretaria de Infraestrutura_`,
  ];

  return lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Link do WhatsApp já aberto na conversa com o número informado.
 * Números brasileiros sem DDI (10 ou 11 dígitos) recebem o 55.
 * Sem número válido, abre o WhatsApp para escolher o contato.
 */
export function linkWhatsAppPara(telefone: string | null | undefined, texto: string): string {
  let numero = (telefone || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  const encoded = encodeURIComponent(texto);
  return numero.length >= 12
    ? `https://wa.me/${numero}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

export function abrirWhatsAppPara(telefone: string | null | undefined, texto: string) {
  if (typeof window !== 'undefined') {
    window.open(linkWhatsAppPara(telefone, texto), '_blank', 'noopener,noreferrer');
  }
}
