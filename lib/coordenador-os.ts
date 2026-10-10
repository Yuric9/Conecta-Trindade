/**
 * Dados da tela do coordenador ("Minhas O.S.").
 *
 * Com o banco: usa as funções minhas_os() e coordenador_atualizar_os(),
 * que só mostram/alteram as O.S. do próprio coordenador (sem CPF nem
 * observações internas).
 * Modo demonstração: usa os chamados guardados no navegador, como se o
 * usuário fosse o coordenador de exemplo.
 */
import {
  supabase,
  isSupabaseConfigured,
  getStoredChamadosList,
  saveStoredChamadoItem,
} from '@/lib/supabase/client';
import { normalizarStatusOS, type StatusOS } from '@/lib/os-status';
import { authHeaders } from '@/lib/auth-headers';
import { assinarFotosDaLista } from '@/lib/fotos-os';

export const COORDENADOR_DEMO_ID = 'demo-coord-001';

export interface MinhaOS {
  id: string;
  protocolo: string;
  categoria: string;
  descricao: string;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  foto_url: string | null;
  nome_cidadao: string | null;
  telefone_cidadao: string | null;
  status: StatusOS;
  prioridade: string;
  sla_limite: string | null;
  encaminhado_em: string | null;
  visualizado_em: string | null;
  iniciado_em: string | null;
  executado_em: string | null;
  concluido_em: string | null;
  foto_execucao_url: string | null;
  observacao_encaminhamento: string | null;
  created_at: string;
}

export type AcaoCoordenador = 'visualizar' | 'iniciar' | 'executar' | 'devolver';

function daLinhaDoBanco(r: any): MinhaOS {
  return {
    id: r.id,
    protocolo: r.protocolo,
    categoria: r.categoria_servico,
    descricao: r.descricao || '',
    endereco: r.endereco || '',
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    foto_url: r.foto_url ?? null,
    nome_cidadao: r.nome_cidadao ?? null,
    telefone_cidadao: r.telefone_cidadao ?? null,
    status: normalizarStatusOS(r.status),
    prioridade: r.prioridade || 'MEDIA',
    sla_limite: r.sla_limite ?? null,
    encaminhado_em: r.encaminhado_em ?? null,
    visualizado_em: r.visualizado_em ?? null,
    iniciado_em: r.iniciado_em ?? null,
    executado_em: r.executado_em ?? null,
    concluido_em: r.concluido_em ?? null,
    foto_execucao_url: r.foto_execucao_url ?? null,
    observacao_encaminhamento: r.observacao_encaminhamento ?? null,
    created_at: r.created_at,
  };
}

/** Chamado do modo demonstração (formato do painel) → MinhaOS */
function daLinhaDemo(c: any): MinhaOS {
  return daLinhaDoBanco({
    ...c,
    categoria_servico: c.categoria,
    endereco: c.endereco_texto,
    foto_url: c.fotos?.[0] ?? null,
    nome_cidadao: c.cidadao_nome,
    telefone_cidadao: c.cidadao_telefone,
  });
}

const EM_ABERTO: StatusOS[] = ['Encaminhada', 'Em Andamento', 'Aguardando Confirmação'];

export async function carregarMinhasOS(): Promise<MinhaOS[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await (supabase as any).rpc('minhas_os');
    if (error) throw new Error(error.message || 'Não foi possível carregar suas O.S.');
    // Fotos do Storage: links temporários (o banco confere que a O.S. é dele)
    return assinarFotosDaLista(supabase as any, ((data as any[]) || []).map(daLinhaDoBanco), ['foto_url', 'foto_execucao_url']);
  }
  const trintaDias = Date.now() - 30 * 86400000;
  return getStoredChamadosList()
    .filter((c: any) => c.coordenador_id === COORDENADOR_DEMO_ID)
    .map(daLinhaDemo)
    .filter(
      (os) =>
        EM_ABERTO.includes(os.status) ||
        (os.status === 'Concluído' && os.concluido_em && new Date(os.concluido_em).getTime() > trintaDias)
    );
}

/** Executa a ação. Devolve null se deu certo ou a mensagem de erro. */
export async function acaoCoordenador(
  os: MinhaOS,
  acao: AcaoCoordenador,
  observacao?: string,
  foto?: string | null
): Promise<string | null> {
  if (isSupabaseConfigured) {
    // Foto do serviço: vai para o Storage pelo servidor; o banco guarda só o endereço
    if (foto && foto.startsWith('data:image/')) {
      try {
        const resp = await fetch('/api/os/foto', {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ chamado_id: os.id, foto }),
        });
        const json = await resp.json().catch(() => ({}));
        if (resp.ok && json.endereco) foto = json.endereco;
        else if (resp.status !== 503) return json.error || 'Não foi possível enviar a foto.';
        // 503: Storage não configurado no servidor → grava a foto como antes
      } catch {
        return 'Sem conexão para enviar a foto. Tente de novo.';
      }
    }
    const { error } = await (supabase as any).rpc('coordenador_atualizar_os', {
      p_chamado: os.id,
      p_acao: acao,
      p_observacao: observacao?.trim() || null,
      p_foto: foto || null,
    });
    return error ? error.message || 'Não foi possível salvar.' : null;
  }

  // Modo demonstração: mesmas regras do banco, aplicadas no navegador
  const agora = new Date().toISOString();
  const mudancas: Record<string, unknown> = { id: os.id };
  if (acao === 'visualizar') {
    if (os.visualizado_em) return null;
    mudancas.visualizado_em = agora;
  } else if (acao === 'iniciar') {
    if (os.status !== 'Encaminhada') return 'Só dá para iniciar uma O.S. encaminhada';
    Object.assign(mudancas, { status: 'Em Andamento', iniciado_em: agora, visualizado_em: os.visualizado_em || agora });
  } else if (acao === 'executar') {
    if (os.status !== 'Encaminhada' && os.status !== 'Em Andamento') return 'Esta O.S. não está em execução';
    Object.assign(mudancas, {
      status: 'Aguardando Confirmação',
      executado_em: agora,
      iniciado_em: os.iniciado_em || agora,
      visualizado_em: os.visualizado_em || agora,
      foto_execucao_url: foto || os.foto_execucao_url,
    });
  } else if (acao === 'devolver') {
    if (!observacao?.trim()) return 'Informe o motivo da devolução';
    Object.assign(mudancas, { status: 'Na Secretaria', coordenador_id: null });
  }
  saveStoredChamadoItem(mudancas);
  return null;
}

/** Link do Google Maps para o local da O.S. (coordenadas ou endereço). */
export function linkMapaOS(os: Pick<MinhaOS, 'latitude' | 'longitude' | 'endereco'>): string {
  if (Number.isFinite(os.latitude) && Number.isFinite(os.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${os.latitude},${os.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${os.endereco}, Trindade - GO`)}`;
}

/** "Vence em 2 dias", "Atrasada há 5 h"... */
export function textoPrazoOS(os: Pick<MinhaOS, 'sla_limite'>): string | null {
  if (!os.sla_limite) return null;
  const horas = (new Date(os.sla_limite).getTime() - Date.now()) / 3600000;
  if (horas < 0) {
    const atraso = Math.abs(horas);
    return atraso < 24 ? `Atrasada há ${Math.ceil(atraso)} h` : `Atrasada há ${Math.floor(atraso / 24)} dia(s)`;
  }
  if (horas < 24) return `Vence em ${Math.max(1, Math.floor(horas))} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias`;
}
