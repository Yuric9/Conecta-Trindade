/**
 * Painel de cobrança por coordenador.
 *
 * Com o banco: painel_coordenadores() conta tudo direto no banco e
 * registrar_cobranca_coordenador() guarda quem cobrou.
 * Modo demonstração: calcula com os chamados e perfis do navegador.
 */
import {
  supabase,
  isSupabaseConfigured,
  getStoredChamadosList,
  getStoredProfiles,
} from '@/lib/supabase/client';
import { getCategoriaInfo, normalizeCategoria, formatData } from '@/lib/types';
import { normalizarStatusOS } from '@/lib/os-status';

export interface OSPendente {
  id: string;
  protocolo: string;
  categoria: string;
  endereco: string | null;
  status: string;
  sla_limite: string | null;
  encaminhado_em: string | null;
  visualizado_em: string | null;
}

export interface LinhaCoordenador {
  coordenador_id: string;
  nome: string;
  telefone: string | null;
  servicos: string[];
  status: string | null;
  abertas: number;
  nao_vistas: number;
  em_execucao: number;
  atrasadas: number;
  aguardando: number;
  concluidas_30d: number;
  tempo_medio_horas: number | null;
  ultima_cobranca: string | null;
  ultima_cobranca_por: string | null;
  cobrancas_7d: number;
  pendentes: OSPendente[];
}

const CHAVE_COBRANCAS_DEMO = 'conecta_trindade_cobrancas_coord';
const ABERTAS = ['Encaminhada', 'Em Andamento'];

function lerCobrancasDemo(): { coordenador_id: string; autor_nome: string; created_at: string }[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_COBRANCAS_DEMO) || '[]');
  } catch {
    return [];
  }
}

function calcularDemo(chamadosPainel?: any[]): LinhaCoordenador[] {
  const agora = Date.now();
  const trintaDias = agora - 30 * 86400000;
  const seteDias = agora - 7 * 86400000;
  const chamados = (chamadosPainel ?? getStoredChamadosList()).map((c: any) => ({ ...c, status: normalizarStatusOS(c.status) }));
  const cobrancas = lerCobrancasDemo();

  const linhas = getStoredProfiles()
    .filter((p: any) => p.role === 'coordenador')
    .map((p: any): LinhaCoordenador => {
      const dele = chamados.filter((c: any) => c.coordenador_id === p.id);
      const abertas = dele.filter((c: any) => ABERTAS.includes(c.status));
      const execucoes = dele.filter(
        (c: any) =>
          c.executado_em &&
          c.encaminhado_em &&
          new Date(c.executado_em).getTime() >= trintaDias &&
          new Date(c.executado_em) >= new Date(c.encaminhado_em)
      );
      const media = execucoes.length
        ? execucoes.reduce(
            (s: number, c: any) => s + (new Date(c.executado_em).getTime() - new Date(c.encaminhado_em).getTime()),
            0
          ) /
          execucoes.length /
          3600000
        : null;
      const minhas = cobrancas
        .filter((x) => x.coordenador_id === p.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return {
        coordenador_id: p.id,
        nome: p.nome,
        telefone: p.telefone ?? null,
        servicos: p.servicos || [],
        status: p.status ?? null,
        abertas: abertas.length,
        nao_vistas: abertas.filter((c: any) => c.status === 'Encaminhada' && !c.visualizado_em).length,
        em_execucao: abertas.filter((c: any) => c.status === 'Em Andamento').length,
        atrasadas: abertas.filter((c: any) => c.sla_limite && new Date(c.sla_limite).getTime() < agora).length,
        aguardando: dele.filter((c: any) => c.status === 'Aguardando Confirmação').length,
        concluidas_30d: dele.filter(
          (c: any) => c.status === 'Concluído' && c.concluido_em && new Date(c.concluido_em).getTime() >= trintaDias
        ).length,
        tempo_medio_horas: media === null ? null : Math.round(media * 10) / 10,
        ultima_cobranca: minhas[0]?.created_at ?? null,
        ultima_cobranca_por: minhas[0]?.autor_nome ?? null,
        cobrancas_7d: minhas.filter((x) => new Date(x.created_at).getTime() >= seteDias).length,
        pendentes: abertas
          .sort(
            (a: any, b: any) =>
              (a.sla_limite ? new Date(a.sla_limite).getTime() : Infinity) -
              (b.sla_limite ? new Date(b.sla_limite).getTime() : Infinity)
          )
          .slice(0, 30)
          .map((c: any) => ({
            id: c.id,
            protocolo: c.protocolo,
            categoria: c.categoria,
            endereco: c.endereco_texto ?? c.endereco ?? null,
            status: c.status,
            sla_limite: c.sla_limite ?? null,
            encaminhado_em: c.encaminhado_em ?? null,
            visualizado_em: c.visualizado_em ?? null,
          })),
      };
    });

  return linhas.sort((a, b) => b.atrasadas - a.atrasadas || b.abertas - a.abertas || a.nome.localeCompare(b.nome));
}

/** No modo demonstração, `chamadosDemo` são as O.S. que o painel já mostra. */
export async function carregarPainelCoordenadores(chamadosDemo?: any[]): Promise<LinhaCoordenador[]> {
  if (!isSupabaseConfigured) return calcularDemo(chamadosDemo);
  const { data, error } = await (supabase as any).rpc('painel_coordenadores');
  if (error) throw new Error(error.message || 'Não foi possível carregar o painel dos coordenadores.');
  return ((data as any[]) || []).map((r) => ({
    ...r,
    servicos: r.servicos || [],
    tempo_medio_horas: r.tempo_medio_horas === null ? null : Number(r.tempo_medio_horas),
    pendentes: Array.isArray(r.pendentes) ? r.pendentes : [],
  }));
}

/** Guarda que o coordenador foi cobrado. Devolve null se deu certo ou a mensagem de erro. */
export async function registrarCobrancaCoordenador(coordenadorId: string, autorNome: string): Promise<string | null> {
  if (isSupabaseConfigured) {
    const { error } = await (supabase as any).rpc('registrar_cobranca_coordenador', { p_coordenador: coordenadorId });
    return error ? error.message || 'Não foi possível registrar a cobrança.' : null;
  }
  try {
    const lista = lerCobrancasDemo();
    lista.push({ coordenador_id: coordenadorId, autor_nome: autorNome, created_at: new Date().toISOString() });
    localStorage.setItem(CHAVE_COBRANCAS_DEMO, JSON.stringify(lista));
  } catch {
    // modo demonstração: sem armazenamento, só não guarda
  }
  return null;
}

/** "3,5 h" ou "2,1 dias" */
export function formatarHoras(horas: number | null): string {
  if (horas === null || !Number.isFinite(horas)) return '—';
  if (horas < 48) return `${horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
  return `${(horas / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}

/** Mensagem de cobrança para o WhatsApp do coordenador. */
export function mensagemCobranca(linha: LinhaCoordenador, quemCobra: string): string {
  const primeiroNome = (linha.nome || '').trim().split(' ')[0];
  const agora = Date.now();
  const itens = linha.pendentes.map((os) => {
    const atrasada = os.sla_limite && new Date(os.sla_limite).getTime() < agora;
    const prazo = os.sla_limite
      ? `${atrasada ? 'venceu' : 'prazo'} ${formatData(os.sla_limite).slice(0, 10)}`
      : 'sem prazo';
    const servico = getCategoriaInfo(normalizeCategoria(os.categoria)).label;
    const situacao = os.status === 'Em Andamento' ? 'em execução' : !os.visualizado_em ? 'ainda não vista' : 'não iniciada';
    return `${atrasada ? '⚠️' : '•'} *${os.protocolo}* – ${servico} – ${os.endereco || 'sem endereço'} (${prazo}, ${situacao})`;
  });
  const restantes = linha.abertas - linha.pendentes.length;

  const linhas = [
    `Olá, ${primeiroNome || 'coordenador'}! Aqui é ${quemCobra}.`,
    '',
    `Você tem *${linha.abertas} O.S. em aberto*${linha.atrasadas ? `, sendo *${linha.atrasadas} atrasada(s)*` : ''}:`,
    ...itens,
    restantes > 0 ? `… e mais ${restantes}.` : null,
    '',
    'Por favor, dê andamento e atualize no sistema (Iniciar / Executei) ou devolva com o motivo se não for possível.',
    typeof window !== 'undefined' ? `📲 ${window.location.origin}/coordenador` : null,
    '_Prefeitura de Trindade – Secretaria de Infraestrutura_',
  ];
  return linhas.filter((l) => l !== null).join('\n');
}
