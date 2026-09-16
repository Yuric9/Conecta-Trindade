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
