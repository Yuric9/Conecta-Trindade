'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCategoriaInfo, normalizeCategoria, formatData, tempoRelativo } from '@/lib/types';
import { NOME_PAPEL, type PapelOS } from '@/lib/os-status';
import { abrirWhatsAppPara } from '@/lib/whatsapp-share';
import {
  carregarPainelCoordenadores,
  registrarCobrancaCoordenador,
  mensagemCobranca,
  formatarHoras,
  type LinhaCoordenador,
} from '@/lib/painel-coordenadores';
import { Button } from '@/components/ui/button';
import {
  HardHat,
  RefreshCw,
  Loader2,
  MessageCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Phone,
  Clock,
  Megaphone,
} from 'lucide-react';

interface Props {
  papel: PapelOS | null;
  nomeUsuario: string | null | undefined;
  /** Abre a aba de O.S. já filtrada por este coordenador */
  onVerOS?: (coordenadorId: string) => void;
  /** Modo demonstração: as mesmas O.S. da aba "Ordens de Serviço" */
  chamadosDemo?: any[];
}

/** Números de cada coordenador e botão para cobrar pelo WhatsApp. */
export default function AdminCoordenadoresTab({ papel, nomeUsuario, onVerOS, chamadosDemo }: Props) {
  const [linhas, setLinhas] = useState<LinhaCoordenador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [soComPendencia, setSoComPendencia] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setLinhas(await carregarPainelCoordenadores(chamadosDemo));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar.');
    } finally {
      setCarregando(false);
    }
  }, [chamadosDemo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totais = useMemo(
    () =>
      linhas.reduce(
        (t, l) => ({
          abertas: t.abertas + l.abertas,
          atrasadas: t.atrasadas + l.atrasadas,
          aguardando: t.aguardando + l.aguardando,
          concluidas: t.concluidas + l.concluidas_30d,
        }),
        { abertas: 0, atrasadas: 0, aguardando: 0, concluidas: 0 }
      ),
    [linhas]
  );

  const visiveis = soComPendencia ? linhas.filter((l) => l.abertas > 0 || l.aguardando > 0) : linhas;

  // "Bruna (Secretaria de Infraestrutura)" ou, sem nome, "a Secretaria de Infraestrutura"
  const setor = papel === 'central' ? NOME_PAPEL.central : NOME_PAPEL.secretaria;
  const primeiroNome = (nomeUsuario || '').trim().split(' ')[0];
  const quemCobra = primeiroNome ? `${primeiroNome} (${setor})` : `a ${setor}`;

  const cobrar = async (linha: LinhaCoordenador) => {
    // Abre o WhatsApp já no clique (o navegador bloqueia janela aberta depois)
    abrirWhatsAppPara(linha.telefone, mensagemCobranca(linha, quemCobra));
    const falha = await registrarCobrancaCoordenador(linha.coordenador_id, nomeUsuario || 'Equipe');
    setAviso(
      falha
        ? { tipo: 'erro', texto: `WhatsApp aberto, mas a cobrança não foi registrada: ${falha}` }
        : { tipo: 'ok', texto: `Cobrança de ${linha.nome.split(' ')[0]} registrada no histórico das O.S.` }
    );
    setTimeout(() => setAviso(null), 5000);
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-[#006653]" />
            Coordenadores
          </h2>
          <p className="text-sm text-gray-600">
            Quem está com O.S. parada ou atrasada. Concluídas e tempo médio: últimos 30 dias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={soComPendencia}
              onChange={(e) => setSoComPendencia(e.target.checked)}
              className="accent-[#006653]"
            />
            Só com pendência
          </label>
          <Button variant="outline" onClick={carregar} disabled={carregando} className="h-9 text-xs gap-1.5">
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Resumo rotulo="O.S. em aberto" valor={totais.abertas} />
        <Resumo rotulo="Atrasadas" valor={totais.atrasadas} cor={totais.atrasadas ? 'text-red-700' : undefined} />
        <Resumo
          rotulo="Esperando a Secretaria confirmar"
          valor={totais.aguardando}
          cor={totais.aguardando ? 'text-cyan-800' : undefined}
        />
        <Resumo rotulo="Concluídas (30 dias)" valor={totais.concluidas} cor="text-emerald-700" />
      </div>

      {aviso && (
        <div
          role="status"
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
            aviso.tipo === 'ok' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {aviso.texto}
        </div>
      )}
      {erro && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900">{erro}</div>}

      {carregando && linhas.length === 0 ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-7 h-7 text-[#006653] animate-spin" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          {linhas.length === 0
            ? 'Nenhum coordenador cadastrado. O admin cadastra na aba Usuários.'
            : 'Nenhum coordenador com pendência.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {visiveis.map((l) => {
            const expandido = aberto === l.coordenador_id;
            const temTelefone = (l.telefone || '').replace(/\D/g, '').length >= 10;
            return (
              <article
                key={l.coordenador_id}
                className={`bg-white rounded-xl border shadow-sm ${
                  l.atrasadas ? 'border-red-300 border-l-4 border-l-red-500' : 'border-gray-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {l.nome}
                        {l.status && l.status !== 'ativo' && (
                          <span className="rounded bg-gray-100 px-1.5 text-[10px] font-bold text-gray-600 uppercase">{l.status}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {l.telefone || 'sem telefone'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {l.servicos.map((s) => (
                          <span key={s} className="rounded-full bg-emerald-50 border border-emerald-200 px-2 text-[11px] text-emerald-900">
                            {getCategoriaInfo(s).label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {l.atrasadas > 0 && (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        <AlertTriangle className="w-3 h-3" />
                        {l.atrasadas} atrasada{l.atrasadas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    <Numero rotulo="Abertas" valor={l.abertas} />
                    <Numero rotulo="Não vistas" valor={l.nao_vistas} destaque={l.nao_vistas > 0 ? 'text-amber-700' : undefined} />
                    <Numero rotulo="Em execução" valor={l.em_execucao} />
                    <Numero rotulo="P/ confirmar" valor={l.aguardando} destaque={l.aguardando > 0 ? 'text-cyan-800' : undefined} />
                    <Numero rotulo="Concluídas" valor={l.concluidas_30d} destaque="text-emerald-700" />
                    <Numero rotulo="Tempo médio" valor={formatarHoras(l.tempo_medio_horas)} />
                  </dl>

                  <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" />
                    {l.ultima_cobranca
                      ? `Última cobrança ${tempoRelativo(l.ultima_cobranca)}${l.ultima_cobranca_por ? ` por ${l.ultima_cobranca_por.split(' ')[0]}` : ''} · ${l.cobrancas_7d} em 7 dias`
                      : 'Ainda não foi cobrado'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAberto(expandido ? null : l.coordenador_id)}
                      disabled={l.abertas === 0}
                      aria-expanded={expandido}
                      className="flex items-center gap-1 text-xs font-semibold text-[#006653] disabled:text-gray-400"
                    >
                      {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {l.abertas === 0 ? 'Nenhuma O.S. em aberto' : expandido ? 'Esconder O.S.' : `Ver as ${l.abertas} O.S. em aberto`}
                    </button>
                    {onVerOS && (
                      <button
                        type="button"
                        onClick={() => onVerOS(l.coordenador_id)}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        Abrir na lista de O.S.
                      </button>
                    )}
                    <Button
                      onClick={() => cobrar(l)}
                      disabled={l.abertas === 0}
                      className="ml-auto h-9 bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold gap-1.5"
                      title={temTelefone ? undefined : 'Sem telefone: o WhatsApp vai pedir para escolher o contato'}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Cobrar no WhatsApp
                    </Button>
                  </div>
                </div>

                {expandido && (
                  <ul className="border-t border-gray-100 divide-y divide-gray-100 text-sm">
                    {l.pendentes.map((os) => {
                      const atrasada = os.sla_limite && new Date(os.sla_limite).getTime() < Date.now();
                      return (
                        <li key={os.id} className="px-4 py-2 flex items-start gap-2">
                          {atrasada ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-900">
                              <span className="font-mono text-xs font-bold text-[#006653]">{os.protocolo}</span>{' '}
                              {getCategoriaInfo(normalizeCategoria(os.categoria)).label}
                            </p>
                            <p className="text-xs text-gray-600 truncate">{os.endereco || 'Sem endereço'}</p>
                          </div>
                          <div className="text-right text-[11px] shrink-0">
                            <p className={atrasada ? 'text-red-700 font-semibold' : 'text-gray-600'}>
                              {os.sla_limite ? `${atrasada ? 'Venceu' : 'Prazo'} ${formatData(os.sla_limite).slice(0, 10)}` : 'Sem prazo'}
                            </p>
                            <p className="text-gray-500">
                              {os.status === 'Em Andamento' ? 'Em execução' : os.visualizado_em ? 'Vista' : 'Não vista'}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                    {l.abertas > l.pendentes.length && (
                      <li className="px-4 py-2 text-xs text-gray-500">… e mais {l.abertas - l.pendentes.length}.</li>
                    )}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Resumo({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className={`text-2xl font-bold ${cor || 'text-gray-900'}`}>{valor}</p>
      <p className="text-xs text-gray-600">{rotulo}</p>
    </div>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: number | string; destaque?: string }) {
  const zero = valor === 0;
  return (
    <div className="rounded-lg bg-gray-50 py-1.5">
      <dd className={`text-base font-bold ${zero ? 'text-gray-400' : destaque || 'text-gray-900'}`}>{valor}</dd>
      <dt className="text-[10px] text-gray-500 leading-tight">{rotulo}</dt>
    </div>
  );
}
