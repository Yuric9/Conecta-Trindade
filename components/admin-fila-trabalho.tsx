'use client';

/**
 * "Minha fila": o painel de trabalho de cada função.
 *
 * - Central de atendimento: pedidos novos, respostas ao cidadão pendentes e
 *   O.S. que estão com a Secretaria (para atender quem liga cobrando).
 * - Secretaria de Infraestrutura: O.S. que chegaram, execuções para
 *   confirmar, O.S. com os coordenadores e concluídas.
 *
 * Os botões de cada O.S. são os mesmos da tabela (vêm prontos da página).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Chamado } from '@/lib/types';
import { getCategoriaInfo, normalizeCategoria, tempoRelativo, formatData } from '@/lib/types';
import { normalizarStatusOS, osEmAberto, prazoVencido, STATUS_OS_INFO, NOME_PAPEL, type PapelOS, type StatusOS } from '@/lib/os-status';
import { CategoriaIcone } from '@/components/categoria-icone';
import { AlertTriangle, CheckCircle2, Clock, EyeOff, Inbox, MapPin, User, HardHat, ListChecks } from 'lucide-react';

type IdFila = 'novas' | 'responder' | 'na_secretaria' | 'chegaram' | 'confirmar' | 'com_coordenadores' | 'concluidas';

interface Fila {
  id: IdFila;
  titulo: string;
  ajuda: string;
  vazio: string;
  itens: Chamado[];
  /** Quando a O.S. entrou nesta fila (para "há 2 h") */
  desde: (c: Chamado) => string | null | undefined;
  alerta?: boolean;
}

interface Props {
  papel: PapelOS | null;
  nomeUsuario?: string | null;
  chamados: Chamado[];
  nomeCoordenador: (id: string | null | undefined) => string | null;
  /** Botões da O.S. (próximo passo + menu), os mesmos da tabela */
  renderAcoes: (c: Chamado) => ReactNode;
  onAbrir: (c: Chamado) => void;
  onVerTodas: () => void;
}

const status = (c: Chamado): StatusOS => normalizarStatusOS(c.status);
const tempo = (d: string | null | undefined) => (d ? new Date(d).getTime() : 0);
/** Mais antigas primeiro (quem espera há mais tempo vem antes) */
const porEspera = (desde: Fila['desde']) => (a: Chamado, b: Chamado) => tempo(desde(a)) - tempo(desde(b));
/** Atrasadas primeiro, depois prazo mais curto */
const porPrazo = (a: Chamado, b: Chamado) =>
  Number(prazoVencido(b)) - Number(prazoVencido(a)) ||
  (a.sla_limite ? tempo(a.sla_limite) : Infinity) - (b.sla_limite ? tempo(b.sla_limite) : Infinity);

function montarFilas(papel: PapelOS | null, chamados: Chamado[]): Fila[] {
  const trintaDias = Date.now() - 30 * 86400000;
  if (papel === 'central') {
    const novasDesde = (c: Chamado) => c.created_at;
    const responderDesde = (c: Chamado) => c.concluido_em || c.updated_at;
    const naSecretariaDesde = (c: Chamado) => c.na_secretaria_em || c.created_at;
    const naSecretaria = chamados.filter((c) =>
      ['Na Secretaria', 'Encaminhada', 'Em Andamento', 'Aguardando Confirmação'].includes(status(c))
    );
    return [
      {
        id: 'novas',
        titulo: 'Novas',
        ajuda: 'Pedidos dos cidadãos. Confira e envie à Secretaria de Infraestrutura ou cancele com o motivo.',
        vazio: 'Nenhum pedido novo.',
        itens: chamados.filter((c) => status(c) === 'Pendente').sort(porEspera(novasDesde)),
        desde: novasDesde,
      },
      {
        id: 'responder',
        titulo: 'Responder ao cidadão',
        ajuda: 'O.S. concluídas ou canceladas que ainda não tiveram resposta ao cidadão.',
        vazio: 'Nenhuma resposta pendente.',
        itens: chamados.filter((c) => !osEmAberto(c.status) && !c.resposta_cidadao).sort(porEspera(responderDesde)),
        desde: responderDesde,
        alerta: true,
      },
      {
        id: 'na_secretaria',
        titulo: 'Com a Secretaria',
        ajuda: 'Para acompanhar e atender o cidadão que liga cobrando. As cobradas e atrasadas aparecem primeiro.',
        vazio: 'Nenhuma O.S. com a Secretaria.',
        itens: naSecretaria.sort(
          (a, b) => (b.cobrancas || 0) - (a.cobrancas || 0) || porPrazo(a, b)
        ),
        desde: naSecretariaDesde,
      },
    ];
  }

  // Secretaria (e admin, se abrir esta aba)
  const chegaramDesde = (c: Chamado) => c.na_secretaria_em || c.created_at;
  const confirmarDesde = (c: Chamado) => c.executado_em || c.updated_at;
  const comCoordDesde = (c: Chamado) => c.encaminhado_em || c.updated_at;
  const concluidasDesde = (c: Chamado) => c.concluido_em || c.updated_at;
  return [
    {
      id: 'chegaram',
      titulo: 'Chegaram',
      ajuda: 'Enviadas pela central. Escolha o coordenador do serviço (ou devolva à central se não for da Infraestrutura).',
      vazio: 'Nenhuma O.S. esperando coordenador.',
      itens: chamados.filter((c) => status(c) === 'Na Secretaria').sort(porEspera(chegaramDesde)),
      desde: chegaramDesde,
    },
    {
      id: 'confirmar',
      titulo: 'Para confirmar',
      ajuda: 'O coordenador avisou que terminou. Confira e confirme, ou não aceite e devolva a ele.',
      vazio: 'Nenhuma execução para confirmar.',
      itens: chamados.filter((c) => status(c) === 'Aguardando Confirmação').sort(porEspera(confirmarDesde)),
      desde: confirmarDesde,
      alerta: true,
    },
    {
      id: 'com_coordenadores',
      titulo: 'Com os coordenadores',
      ajuda: 'Em andamento no campo. Atrasadas primeiro. Para cobrar, use a aba Coordenadores.',
      vazio: 'Nenhuma O.S. com os coordenadores.',
      itens: chamados.filter((c) => ['Encaminhada', 'Em Andamento'].includes(status(c))).sort(porPrazo),
      desde: comCoordDesde,
    },
    {
      id: 'concluidas',
      titulo: 'Concluídas',
      ajuda: 'Confirmadas nos últimos 30 dias.',
      vazio: 'Nenhuma O.S. concluída nos últimos 30 dias.',
      itens: chamados
        .filter((c) => status(c) === 'Concluído' && tempo(concluidasDesde(c)) >= trintaDias)
        .sort((a, b) => tempo(concluidasDesde(b)) - tempo(concluidasDesde(a))),
      desde: concluidasDesde,
    },
  ];
}

export default function AdminFilaTrabalho({ papel, nomeUsuario, chamados, nomeCoordenador, renderAcoes, onAbrir, onVerTodas }: Props) {
  const filas = useMemo(() => montarFilas(papel, chamados), [papel, chamados]);
  const [ativa, setAtiva] = useState<IdFila>(filas[0].id);

  // Se o papel mudar (carregou o perfil), volta para a primeira fila dele
  useEffect(() => {
    if (!filas.some((f) => f.id === ativa)) setAtiva(filas[0].id);
  }, [filas, ativa]);

  const fila = filas.find((f) => f.id === ativa) ?? filas[0];
  const atrasadas = filas
    .filter((f) => f.id !== 'concluidas' && f.id !== 'responder')
    .reduce((n, f) => n + f.itens.filter((c) => prazoVencido(c)).length, 0);
  const setor = papel === 'central' ? NOME_PAPEL.central : NOME_PAPEL.secretaria;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#006653]" />
            Minha fila · {setor}
          </h2>
          <p className="text-sm text-gray-600">
            {nomeUsuario ? `${nomeUsuario.split(' ')[0]}, aqui` : 'Aqui'} está o que depende de você agora.
            {atrasadas > 0 && <span className="ml-1 font-semibold text-red-700">{atrasadas} com prazo vencido.</span>}
          </p>
        </div>
        <button type="button" onClick={onVerTodas} className="flex items-center gap-1.5 text-xs font-semibold text-[#006653] hover:underline">
          <ListChecks className="w-4 h-4" />
          Ver todas as O.S. (tabela)
        </button>
      </div>

      {/* Filas */}
      <div className={`grid gap-2 ${filas.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {filas.map((f) => {
          const sel = f.id === fila.id;
          const destaque = f.alerta && f.itens.length > 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setAtiva(f.id)}
              aria-pressed={sel}
              className={`text-left rounded-xl border p-3 transition-colors ${
                sel ? 'border-[#006653] bg-[#006653] text-white' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`text-2xl font-bold tabular-nums ${sel ? 'text-white' : destaque ? 'text-amber-700' : 'text-gray-900'}`}>
                {f.itens.length}
              </p>
              <p className={`text-sm font-semibold ${sel ? 'text-emerald-50' : 'text-gray-700'}`}>{f.titulo}</p>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-gray-600">{fila.ajuda}</p>

      {fila.itens.length === 0 ? (
        <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium">{fila.vazio}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {fila.itens.map((c) => (
            <ItemFila
              key={c.id || c.protocolo}
              chamado={c}
              desde={fila.desde(c)}
              mostrarCoordenador={fila.id === 'com_coordenadores' || fila.id === 'confirmar' || fila.id === 'na_secretaria'}
              coordenador={nomeCoordenador(c.coordenador_id)}
              acoes={renderAcoes(c)}
              onAbrir={() => onAbrir(c)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemFila({
  chamado: c,
  desde,
  mostrarCoordenador,
  coordenador,
  acoes,
  onAbrir,
}: {
  chamado: Chamado;
  desde: string | null | undefined;
  mostrarCoordenador: boolean;
  coordenador: string | null;
  acoes: ReactNode;
  onAbrir: () => void;
}) {
  const st = status(c);
  const info = STATUS_OS_INFO[st];
  const cat = getCategoriaInfo(normalizeCategoria(c.categoria));
  const vencida = prazoVencido(c);
  const naoVista = st === 'Encaminhada' && !c.visualizado_em;

  return (
    <li
      className={`bg-white rounded-xl border shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
        vencida ? 'border-red-300 border-l-4 border-l-red-500' : 'border-gray-200'
      }`}
    >
      <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-[#006653]">{c.protocolo}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${info.badge}`}>{info.label}</span>
          {c.prioridade === 'ALTA' || c.prioridade === 'URGENTE' ? (
            <span className="rounded border border-orange-300 bg-orange-50 px-1.5 text-[10px] font-bold text-orange-800">
              {c.prioridade === 'URGENTE' ? 'Urgente' : 'Alta'}
            </span>
          ) : null}
          {osEmAberto(c.status) && (c.cobrancas || 0) > 0 && (
            <span className="text-[11px] font-semibold text-amber-800">🔔 Cidadão cobrou{(c.cobrancas || 0) > 1 ? ` (${c.cobrancas}x)` : ''}</span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 font-semibold text-gray-900">
          <CategoriaIcone categoria={cat.id} className="w-4 h-4" />
          {cat.label}
        </p>
        <p className="mt-0.5 flex items-start gap-1.5 text-sm text-gray-700">
          <MapPin className="w-3.5 h-3.5 text-[#006653] shrink-0 mt-0.5" />
          <span className="truncate">{c.endereco_texto || 'Sem endereço'}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {c.cidadao_nome || 'Cidadão'}
          </span>
          {desde && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tempoRelativo(desde)}
            </span>
          )}
          {mostrarCoordenador && coordenador && (
            <span className="flex items-center gap-1">
              <HardHat className="w-3 h-3" />
              {coordenador}
            </span>
          )}
          {naoVista && (
            <span className="flex items-center gap-1 font-semibold text-amber-700">
              <EyeOff className="w-3 h-3" />
              coordenador ainda não viu
            </span>
          )}
          {c.sla_limite && osEmAberto(c.status) && (
            <span className={`flex items-center gap-1 ${vencida ? 'font-semibold text-red-700' : ''}`}>
              {vencida && <AlertTriangle className="w-3 h-3" />}
              {vencida ? 'venceu' : 'prazo'} {formatData(c.sla_limite).slice(0, 10)}
            </span>
          )}
        </p>
      </button>
      <div className="flex items-center gap-2 sm:justify-end shrink-0">{acoes}</div>
    </li>
  );
}
