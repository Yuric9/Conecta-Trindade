/**
 * Relatórios para a gestão: números das O.S. abertas num período.
 *
 * Com o banco: relatorio_os_dados() traz as O.S. do período (sem dados
 * pessoais). Modo demonstração: usa as O.S. que o painel já tem.
 * A conta é a mesma nos dois casos (calcularRelatorio).
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCategoriaInfo, normalizeCategoria } from '@/lib/types';
import { normalizarStatusOS } from '@/lib/os-status';

export interface LinhaRelatorio {
  categoria: string;
  endereco: string | null;
  status: string;
  created_at: string;
  sla_limite: string | null;
  encaminhado_em: string | null;
  executado_em: string | null;
  concluido_em: string | null;
  coordenador_id: string | null;
  cobrancas: number;
}

export interface Periodo {
  inicio: Date;
  /** exclusivo (meia-noite do dia seguinte ao último dia) */
  fim: Date;
  rotulo: string;
}

export type IdPeriodo = 'este_mes' | 'mes_passado' | 'ultimos_90' | 'este_ano';

export const PERIODOS: { id: IdPeriodo; rotulo: string }[] = [
  { id: 'este_mes', rotulo: 'Este mês' },
  { id: 'mes_passado', rotulo: 'Mês passado' },
  { id: 'ultimos_90', rotulo: 'Últimos 90 dias' },
  { id: 'este_ano', rotulo: 'Este ano' },
];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const dataBR = (d: Date) => d.toLocaleDateString('pt-BR');

export function periodoPadrao(id: IdPeriodo, hoje = new Date()): Periodo {
  const a = hoje.getFullYear();
  const m = hoje.getMonth();
  const amanha = new Date(a, m, hoje.getDate() + 1);
  switch (id) {
    case 'mes_passado': {
      const inicio = new Date(a, m - 1, 1);
      return { inicio, fim: new Date(a, m, 1), rotulo: `${MESES_LONGOS[inicio.getMonth()]} de ${inicio.getFullYear()}` };
    }
    case 'ultimos_90': {
      const inicio = new Date(a, m, hoje.getDate() - 89);
      return { inicio, fim: amanha, rotulo: `${dataBR(inicio)} a ${dataBR(hoje)}` };
    }
    case 'este_ano':
      return { inicio: new Date(a, 0, 1), fim: amanha, rotulo: `${a} (até ${dataBR(hoje)})` };
    default:
      return { inicio: new Date(a, m, 1), fim: amanha, rotulo: `${MESES_LONGOS[m]} de ${a} (até ${dataBR(hoje)})` };
  }
}

/** Período escolhido à mão (datas "aaaa-mm-dd", com o último dia incluído) */
export function periodoPersonalizado(de: string, ate: string): Periodo | null {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  if (!a1 || !a2) return null;
  const inicio = new Date(a1, m1 - 1, d1);
  const ultimo = new Date(a2, m2 - 1, d2);
  if (ultimo < inicio) return null;
  return { inicio, fim: new Date(a2, m2 - 1, d2 + 1), rotulo: `${dataBR(inicio)} a ${dataBR(ultimo)}` };
}

function daLinha(r: any): LinhaRelatorio {
  return {
    categoria: r.categoria_servico ?? r.categoria ?? '',
    endereco: r.endereco ?? r.endereco_texto ?? null,
    status: r.status,
    created_at: r.created_at,
    sla_limite: r.sla_limite ?? null,
    encaminhado_em: r.encaminhado_em ?? null,
    executado_em: r.executado_em ?? null,
    concluido_em: r.concluido_em ?? null,
    coordenador_id: r.coordenador_id ?? null,
    cobrancas: Number(r.cobrancas) || 0,
  };
}

export async function carregarDadosRelatorio(periodo: Periodo, chamadosDemo: any[] = []): Promise<LinhaRelatorio[]> {
  if (!isSupabaseConfigured) {
    return chamadosDemo
      .filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= periodo.inicio.getTime() && t < periodo.fim.getTime();
      })
      .map(daLinha);
  }
  const { data, error } = await (supabase as any).rpc('relatorio_os_dados', {
    p_inicio: periodo.inicio.toISOString(),
    p_fim: periodo.fim.toISOString(),
  });
  if (error) throw new Error(error.message || 'Não foi possível carregar o relatório.');
  return ((data as any[]) || []).map(daLinha);
}

// ---------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------

export interface Resumo {
  recebidos: number;
  concluidos: number;
  emAberto: number;
  cancelados: number;
  atrasadosAgora: number;
  /** % das concluídas com prazo que terminaram dentro do prazo (null se nenhuma) */
  noPrazoPct: number | null;
  /** dias, da abertura à conclusão (média) */
  tempoMedioDias: number | null;
  /** horas, de encaminhar ao coordenador até ele executar (média) */
  tempoExecucaoHoras: number | null;
  cobradosPeloCidadao: number;
}

export interface LinhaGrupo {
  chave: string;
  rotulo: string;
  recebidos: number;
  concluidos: number;
  emAberto: number;
  noPrazoPct: number | null;
  tempoMedioDias: number | null;
}

export interface Relatorio {
  resumo: Resumo;
  porServico: LinhaGrupo[];
  porMes: LinhaGrupo[];
  porRua: LinhaGrupo[];
  porCoordenador: (LinhaGrupo & { tempoExecucaoHoras: number | null })[];
}

const horas = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3600000;
const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const arred = (x: number | null, casas = 1) => (x === null ? null : Math.round(x * 10 ** casas) / 10 ** casas);

function contar(linhas: LinhaRelatorio[]) {
  const agora = Date.now();
  const concluidas = linhas.filter((l) => normalizarStatusOS(l.status) === 'Concluído');
  const comPrazo = concluidas.filter((l) => l.sla_limite && l.concluido_em);
  const noPrazo = comPrazo.filter((l) => new Date(l.concluido_em!) <= new Date(l.sla_limite!));
  const abertas = linhas.filter((l) => !['Concluído', 'Cancelado'].includes(normalizarStatusOS(l.status)));
  const duracoes = concluidas
    .filter((l) => l.concluido_em)
    .map((l) => horas(l.created_at, l.concluido_em!))
    .filter((h) => h >= 0);
  const execucoes = linhas
    .filter((l) => l.encaminhado_em && l.executado_em)
    .map((l) => horas(l.encaminhado_em!, l.executado_em!))
    .filter((h) => h >= 0);
  return {
    recebidos: linhas.length,
    concluidos: concluidas.length,
    emAberto: abertas.length,
    cancelados: linhas.filter((l) => normalizarStatusOS(l.status) === 'Cancelado').length,
    atrasadosAgora: abertas.filter((l) => l.sla_limite && new Date(l.sla_limite).getTime() < agora).length,
    noPrazoPct: comPrazo.length ? Math.round((noPrazo.length / comPrazo.length) * 100) : null,
    tempoMedioDias: arred(media(duracoes) === null ? null : media(duracoes)! / 24),
    tempoExecucaoHoras: arred(media(execucoes)),
    cobradosPeloCidadao: linhas.filter((l) => l.cobrancas > 0).length,
  };
}

function agrupar(
  linhas: LinhaRelatorio[],
  chaveDe: (l: LinhaRelatorio) => string | null,
  rotuloDe: (chave: string) => string
): LinhaGrupo[] {
  const grupos = new Map<string, LinhaRelatorio[]>();
  for (const l of linhas) {
    const k = chaveDe(l);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(l);
  }
  return Array.from(grupos.entries()).map(([chave, ls]) => {
    const c = contar(ls);
    return {
      chave,
      rotulo: rotuloDe(chave),
      recebidos: c.recebidos,
      concluidos: c.concluidos,
      emAberto: c.emAberto,
      noPrazoPct: c.noPrazoPct,
      tempoMedioDias: c.tempoMedioDias,
    };
  });
}

/** "Rua das Flores, 120, Centro, Trindade - GO" → "rua das flores" (para juntar pedidos do mesmo lugar) */
export function ruaDoEndereco(endereco: string | null): string | null {
  const primeira = (endereco || '').split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
  if (primeira.length < 3) return null;
  const rua = primeira
    .replace(/^r\.?\s/, 'rua ')
    .replace(/^av\.?\s/, 'avenida ')
    .replace(/^al\.?\s/, 'alameda ');
  // Tira o número da casa ("avenida manoel monteiro 300"), mas não o nome da
  // rua quando ele é um número ("rua 104")
  const semNumero = rua.replace(/\s+(n[º°o.]?\s*)?\d+[a-z]?$/, '').trim();
  return semNumero.split(' ').length >= 2 && semNumero !== rua && !/^(rua|avenida|alameda|travessa)$/.test(semNumero)
    ? semNumero
    : rua;
}

const MINUSCULAS = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
const capitalizar = (s: string) =>
  s
    .split(' ')
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');

export function calcularRelatorio(linhas: LinhaRelatorio[], nomeCoordenador: (id: string) => string): Relatorio {
  const porServico = agrupar(
    linhas,
    (l) => getCategoriaInfo(normalizeCategoria(l.categoria)).id,
    (id) => getCategoriaInfo(id).label
  ).sort((a, b) => b.recebidos - a.recebidos);

  const porMes = agrupar(
    linhas,
    (l) => {
      const d = new Date(l.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    (k) => {
      const [a, m] = k.split('-').map(Number);
      return `${MESES[m - 1]}/${String(a).slice(2)}`;
    }
  ).sort((a, b) => a.chave.localeCompare(b.chave));

  const porRua = agrupar(linhas, (l) => ruaDoEndereco(l.endereco), capitalizar)
    .filter((g) => g.recebidos >= 2)
    .sort((a, b) => b.recebidos - a.recebidos)
    .slice(0, 10);

  const coordenadas = linhas.filter((l) => l.coordenador_id);
  const porCoordenador = agrupar(coordenadas, (l) => l.coordenador_id, nomeCoordenador)
    .map((g) => ({
      ...g,
      tempoExecucaoHoras: contar(coordenadas.filter((l) => l.coordenador_id === g.chave)).tempoExecucaoHoras,
    }))
    .sort((a, b) => b.recebidos - a.recebidos);

  return { resumo: contar(linhas), porServico, porMes, porRua, porCoordenador };
}

/** "2,5 dias" / "18 h" */
export function formatarDias(dias: number | null): string {
  if (dias === null) return '—';
  if (dias < 1) return `${Math.max(1, Math.round(dias * 24))} h`;
  return `${dias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}
