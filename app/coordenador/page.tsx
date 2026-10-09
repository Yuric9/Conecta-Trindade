'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getCategoriaInfo, normalizeCategoria, formatData, tempoRelativo } from '@/lib/types';
import { STATUS_OS_INFO, prazoVencido } from '@/lib/os-status';
import {
  carregarMinhasOS,
  acaoCoordenador,
  linkMapaOS as linkMapa,
  textoPrazoOS as textoPrazo,
  type MinhaOS,
  type AcaoCoordenador,
} from '@/lib/coordenador-os';
import { compressImage } from '@/lib/image-compress';
import { CategoriaIcone } from '@/components/categoria-icone';
import { FolhaOS, FolhaListaOS, AreaImpressao, gerarQrCodesOS } from '@/components/ficha-os';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  HardHat,
  RefreshCw,
  MapPin,
  Phone,
  Navigation,
  Play,
  CheckCircle2,
  Undo2,
  Clock,
  AlertTriangle,
  Camera,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Hourglass,
  FileText,
  Printer,
  LayoutList,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react';

type Aba = 'fazer' | 'atrasadas' | 'aguardando' | 'concluidas';

const PRIORIDADE: Record<string, { label: string; cls: string } | undefined> = {
  ALTA: { label: 'Alta', cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  URGENTE: { label: 'Urgente', cls: 'bg-red-100 text-red-800 border-red-300' },
};

type ModoVer = 'cartoes' | 'lista';
const CHAVE_MODO = 'ct-coordenador-modo';

export default function CoordenadorPage() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [lista, setLista] = useState<MinhaOS[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('fazer');
  const [aberta, setAberta] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  // Janela de "Executei" ou "Devolver"
  const [dialogo, setDialogo] = useState<{ os: MinhaOS; acao: 'executar' | 'devolver' } | null>(null);
  // Janela "Ficha" (O.S. completa) e folha que está indo para a impressora
  const [ficha, setFicha] = useState<MinhaOS | null>(null);
  const [impressao, setImpressao] = useState<{
    chave: number;
    modo: 'ficha' | 'lista';
    itens: MinhaOS[];
    qrs: Record<string, string>;
  } | null>(null);
  const [preparandoImpressao, setPreparandoImpressao] = useState(false);
  const [modoVer, setModoVer] = useState<ModoVer>('cartoes');

  // Lembra se o coordenador prefere cartões ou lista (só neste aparelho)
  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE_MODO) === 'lista') setModoVer('lista');
    } catch {}
  }, []);
  const trocarModo = (modo: ModoVer) => {
    setModoVer(modo);
    try {
      localStorage.setItem(CHAVE_MODO, modo);
    } catch {}
  };

  const ehCoordenador = !isSupabaseConfigured || profile?.role === 'coordenador';

  useEffect(() => {
    if (isSupabaseConfigured && !authLoading && !session) router.push('/login');
  }, [authLoading, session, router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(null);
    try {
      setLista(await carregarMinhasOS());
    } catch (e: any) {
      setErroCarga(e?.message || 'Não foi possível carregar suas O.S.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || (session && profile?.role === 'coordenador')) carregar();
  }, [session, profile?.role, carregar]);

  const mostrarAviso = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 4500);
  };

  const executarAcao = async (os: MinhaOS, acao: AcaoCoordenador, obs?: string, foto?: string | null) => {
    setOcupado(os.id);
    const erro = await acaoCoordenador(os, acao, obs, foto);
    setOcupado(null);
    if (erro) {
      mostrarAviso('erro', erro);
      return false;
    }
    if (acao !== 'visualizar') {
      const textos: Record<string, string> = {
        iniciar: `O.S. ${os.protocolo} em execução.`,
        executar: `O.S. ${os.protocolo} enviada para a Secretaria confirmar.`,
        devolver: `O.S. ${os.protocolo} devolvida para a Secretaria.`,
      };
      mostrarAviso('ok', textos[acao]);
    }
    await carregar();
    return true;
  };

  const abrirDetalhes = (os: MinhaOS) => {
    const abrindo = aberta !== os.id;
    setAberta(abrindo ? os.id : null);
    // "Ciente": registra que o coordenador abriu a O.S. (uma vez só)
    if (abrindo && !os.visualizado_em && (os.status === 'Encaminhada' || os.status === 'Em Andamento')) {
      executarAcao(os, 'visualizar');
    }
  };

  // Lista recarregada: a ficha aberta mostra os dados novos (ex.: "Vista")
  useEffect(() => {
    setFicha((atual) => (atual ? lista.find((o) => o.id === atual.id) ?? atual : atual));
  }, [lista]);

  const abrirFicha = (os: MinhaOS) => {
    setFicha(os);
    if (!os.visualizado_em && (os.status === 'Encaminhada' || os.status === 'Em Andamento')) {
      executarAcao(os, 'visualizar');
    }
  };

  const imprimir = async (modo: 'ficha' | 'lista', itens: MinhaOS[]) => {
    if (itens.length === 0 || preparandoImpressao) return;
    setPreparandoImpressao(true);
    try {
      const qrs = await gerarQrCodesOS(itens, modo === 'ficha' ? 240 : 128);
      setImpressao({ chave: Date.now(), modo, itens, qrs });
    } catch {
      mostrarAviso('erro', 'Não foi possível preparar a impressão.');
    } finally {
      setPreparandoImpressao(false);
    }
  };

  const grupos = useMemo(() => {
    const fazer = lista.filter((o) => o.status === 'Encaminhada' || o.status === 'Em Andamento');
    return {
      fazer,
      atrasadas: fazer.filter((o) => prazoVencido(o)),
      aguardando: lista.filter((o) => o.status === 'Aguardando Confirmação'),
      concluidas: lista.filter((o) => o.status === 'Concluído'),
    };
  }, [lista]);

  const abas: { id: Aba; label: string; n: number; alerta?: boolean }[] = [
    { id: 'fazer', label: 'A fazer', n: grupos.fazer.length },
    { id: 'atrasadas', label: 'Atrasadas', n: grupos.atrasadas.length, alerta: grupos.atrasadas.length > 0 },
    { id: 'aguardando', label: 'Aguardando', n: grupos.aguardando.length },
    { id: 'concluidas', label: 'Concluídas', n: grupos.concluidas.length },
  ];

  if (isSupabaseConfigured && (authLoading || (session && !profile))) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[#006653] animate-spin" />
      </div>
    );
  }

  if (!ehCoordenador) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <HardHat className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Área do coordenador</h1>
        <p className="text-sm text-gray-600 mt-2">
          Esta tela mostra as O.S. encaminhadas a um coordenador de serviço. Sua conta não tem essa função.
        </p>
        <Link href="/" className="inline-block mt-5 text-sm font-semibold text-[#006653] hover:underline">
          Voltar para o início
        </Link>
      </div>
    );
  }

  const itens = grupos[aba];

  return (
    <div className="bg-[#eef1ef] min-h-[calc(100vh-200px)] pb-24 md:pb-10">
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-400/30 text-amber-900 px-4 py-2 text-xs">
          <strong>Modo demonstração:</strong> você está vendo a tela como o coordenador de exemplo (João).
        </div>
      )}

      <div className="ct-malha-urbana text-white">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-emerald-50/90 text-sm flex items-center gap-1.5">
              <HardHat className="w-4 h-4" />
              {profile?.nome ? profile.nome.split(' ')[0] : 'Coordenador'}
            </p>
            <h1 className="text-2xl font-bold font-heading">Minhas O.S.</h1>
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                aba === a.id ? 'bg-white text-[#006653]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {a.label}
              <span
                className={`min-w-[20px] rounded-full px-1.5 text-xs leading-5 ${
                  a.alerta ? 'bg-red-600 text-white' : aba === a.id ? 'bg-emerald-100' : 'bg-white/20'
                }`}
              >
                {a.n}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {aviso && (
          <div
            role="status"
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
              aviso.tipo === 'ok'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {aviso.texto}
          </div>
        )}

        {erroCarga && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900">{erroCarga}</div>
        )}

        {/* Jeito de ver + imprimir a lista da aba */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5" role="group" aria-label="Jeito de ver">
            {(
              [
                ['cartoes', 'Cartões', LayoutGrid],
                ['lista', 'Lista', LayoutList],
              ] as const
            ).map(([id, rotulo, Icone]) => (
              <button
                key={id}
                type="button"
                onClick={() => trocarModo(id)}
                aria-pressed={modoVer === id}
                className={`flex items-center gap-1.5 rounded-md px-2.5 h-8 text-xs font-semibold ${
                  modoVer === id ? 'bg-[#006653] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icone className="w-4 h-4" />
                {rotulo}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => imprimir('lista', itens)}
            disabled={itens.length === 0 || preparandoImpressao}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 h-9 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {preparandoImpressao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Imprimir lista ({itens.length})
          </button>
        </div>

        {carregando && lista.length === 0 ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-7 h-7 text-[#006653] animate-spin" />
          </div>
        ) : itens.length === 0 ? (
          <div className="py-14 text-center text-gray-500">
            <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">
              {aba === 'fazer' && 'Nenhuma O.S. para fazer agora.'}
              {aba === 'atrasadas' && 'Nenhuma O.S. atrasada.'}
              {aba === 'aguardando' && 'Nenhuma O.S. esperando confirmação.'}
              {aba === 'concluidas' && 'Nenhuma O.S. concluída nos últimos 30 dias.'}
            </p>
          </div>
        ) : modoVer === 'lista' ? (
          <ul className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {itens.map((os) => {
              const cat = getCategoriaInfo(normalizeCategoria(os.categoria));
              const vencida = prazoVencido(os) && os.status !== 'Aguardando Confirmação';
              const prazo = textoPrazo(os);
              const prio = PRIORIDADE[os.prioridade];
              const nova = !os.visualizado_em && os.status === 'Encaminhada';
              return (
                <li key={os.id}>
                  <button
                    type="button"
                    onClick={() => abrirFicha(os)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 ${
                      vencida ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <CategoriaIcone categoria={cat.id} className="w-5 h-5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <span className="truncate">{cat.label}</span>
                        {nova && <span className="rounded bg-[#FFC20E] px-1 text-[10px] font-bold text-[#173b32]">NOVA</span>}
                        {prio && <span className={`rounded border px-1 text-[10px] font-bold ${prio.cls}`}>{prio.label}</span>}
                      </span>
                      <span className="block truncate text-xs text-gray-600">{os.endereco || 'Sem endereço'}</span>
                      <span className="block text-[11px] text-gray-500">
                        <span className="font-mono">{os.protocolo}</span>
                        {prazo && os.status !== 'Concluído' && (
                          <span className={vencida ? 'text-red-700 font-semibold' : ''}> · {prazo}</span>
                        )}
                      </span>
                    </span>
                    <span className={`hidden sm:inline rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_OS_INFO[os.status].badge}`}>
                      {STATUS_OS_INFO[os.status].label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          itens.map((os) => {
            const cat = getCategoriaInfo(normalizeCategoria(os.categoria));
            const vencida = prazoVencido(os) && os.status !== 'Aguardando Confirmação';
            const prazo = textoPrazo(os);
            const prio = PRIORIDADE[os.prioridade];
            const expandida = aberta === os.id;
            const nova = !os.visualizado_em && os.status === 'Encaminhada';
            const status = STATUS_OS_INFO[os.status];
            const trabalhando = ocupado === os.id;

            return (
              <article
                key={os.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  vencida ? 'border-red-300 border-l-4 border-l-red-500' : 'border-gray-200'
                }`}
              >
                <button type="button" onClick={() => abrirDetalhes(os)} className="w-full text-left p-4" aria-expanded={expandida}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#006653]">{os.protocolo}</span>
                    <div className="flex items-center gap-1.5">
                      {nova && <span className="rounded bg-[#FFC20E] px-1.5 py-0.5 text-[10px] font-bold text-[#173b32]">NOVA</span>}
                      {prio && (
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${prio.cls}`}>{prio.label}</span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 font-semibold text-gray-900">
                    <CategoriaIcone categoria={cat.id} className="w-5 h-5" />
                    {cat.label}
                  </div>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-[#006653] shrink-0 mt-0.5" />
                    {os.endereco || 'Sem endereço'}
                  </p>
                  {prazo && os.status !== 'Concluído' && (
                    <p className={`mt-1 flex items-center gap-1.5 text-sm ${vencida ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                      {vencida ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      {prazo}
                      <span className="text-xs font-normal text-gray-500">({formatData(os.sla_limite)})</span>
                    </p>
                  )}
                  {os.observacao_encaminhamento && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
                      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                      {os.observacao_encaminhamento}
                    </p>
                  )}
                  <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#006653]">
                    {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandida ? 'Menos detalhes' : 'Ver detalhes'}
                  </span>
                </button>

                {expandida && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 text-sm">
                    <p className="text-gray-800 whitespace-pre-line">{os.descricao || 'Sem descrição.'}</p>
                    {os.foto_url && /^(https:\/\/|data:image\/)/.test(os.foto_url) && (
                      <a href={os.foto_url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={os.foto_url} alt="Foto enviada pelo cidadão" className="w-full max-h-64 object-cover rounded-lg border" />
                      </a>
                    )}
                    <div className="text-gray-600">
                      <p>
                        <span className="text-gray-500">Cidadão:</span> {os.nome_cidadao || 'Não informado'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Aberta {tempoRelativo(os.created_at)}
                        {os.encaminhado_em && ` · encaminhada ${tempoRelativo(os.encaminhado_em)}`}
                      </p>
                    </div>
                    {os.foto_execucao_url && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Sua foto do serviço</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={os.foto_execucao_url} alt="Foto do serviço executado" className="w-full max-h-64 object-cover rounded-lg border" />
                      </div>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
                  <a
                    href={linkMapa(os)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 h-10 text-sm font-semibold text-gray-700 active:bg-gray-50"
                  >
                    <Navigation className="w-4 h-4" />
                    Mapa
                  </a>
                  {os.telefone_cidadao && os.telefone_cidadao.replace(/\D/g, '').length >= 10 && (
                    <a
                      href={`tel:${os.telefone_cidadao.replace(/\D/g, '')}`}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 h-10 text-sm font-semibold text-gray-700 active:bg-gray-50"
                    >
                      <Phone className="w-4 h-4" />
                      Ligar
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirFicha(os)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 h-10 text-sm font-semibold text-gray-700 active:bg-gray-50"
                  >
                    <FileText className="w-4 h-4" />
                    Ficha
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    {(os.status === 'Encaminhada' || os.status === 'Em Andamento') && (
                      <button
                        type="button"
                        onClick={() => setDialogo({ os, acao: 'devolver' })}
                        className="flex items-center gap-1 px-2 h-10 text-sm font-medium text-gray-500 hover:text-gray-800"
                      >
                        <Undo2 className="w-4 h-4" />
                        Devolver
                      </button>
                    )}
                    {os.status === 'Encaminhada' && (
                      <Button
                        onClick={() => executarAcao(os, 'iniciar')}
                        disabled={trabalhando}
                        className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                      >
                        {trabalhando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Iniciar
                      </Button>
                    )}
                    {os.status === 'Em Andamento' && (
                      <Button
                        onClick={() => setDialogo({ os, acao: 'executar' })}
                        disabled={trabalhando}
                        className="h-10 bg-[#006653] hover:bg-[#005242] text-white font-semibold gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Executei
                      </Button>
                    )}
                    {os.status === 'Aguardando Confirmação' && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-800">
                        <Hourglass className="w-4 h-4" />
                        Aguardando a Secretaria confirmar
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <DialogoFicha
        os={ficha}
        onFechar={() => setFicha(null)}
        onImprimir={(os) => imprimir('ficha', [os])}
        imprimindo={preparandoImpressao}
      />

      {impressao && (
        <AreaImpressao key={impressao.chave} onFim={() => setImpressao(null)}>
          {impressao.modo === 'ficha' ? (
            <FolhaOS os={impressao.itens[0]} qr={impressao.qrs[impressao.itens[0].id] ?? null} />
          ) : (
            <FolhaListaOS
              titulo={`Roteiro de O.S. · ${abas.find((a) => a.id === aba)?.label ?? ''}`}
              responsavel={profile?.nome || 'Coordenador'}
              itens={impressao.itens}
              qrs={impressao.qrs}
            />
          )}
        </AreaImpressao>
      )}

      <DialogoAcao
        dados={dialogo}
        onFechar={() => setDialogo(null)}
        onConfirmar={async (obs, foto) => {
          if (!dialogo) return;
          const ok = await executarAcao(dialogo.os, dialogo.acao, obs, foto);
          if (ok) setDialogo(null);
        }}
        ocupado={Boolean(dialogo && ocupado === dialogo.os.id)}
      />
    </div>
  );
}

/** A O.S. completa na tela, com Imprimir e Mapa. */
function DialogoFicha({
  os,
  onFechar,
  onImprimir,
  imprimindo,
}: {
  os: MinhaOS | null;
  onFechar: () => void;
  onImprimir: (os: MinhaOS) => void;
  imprimindo: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    setQr(null);
    if (!os) return;
    let ativo = true;
    gerarQrCodesOS([os])
      .then((qrs) => ativo && setQr(qrs[os.id] ?? null))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [os]);

  if (!os) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-2xl bg-white max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#006653]" />
            Ficha da O.S.
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-gray-200 p-3 sm:p-5">
          <FolhaOS os={os} qr={qr} />
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onFechar} className="h-11">
            Fechar
          </Button>
          <a
            href={linkMapa(os)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 px-4 h-11 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Navigation className="w-4 h-4" />
            Abrir no mapa
          </a>
          <Button
            type="button"
            onClick={() => onImprimir(os)}
            disabled={imprimindo}
            className="h-11 bg-[#006653] hover:bg-[#005242] text-white font-semibold gap-1.5"
          >
            {imprimindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoAcao({
  dados,
  onFechar,
  onConfirmar,
  ocupado,
}: {
  dados: { os: MinhaOS; acao: 'executar' | 'devolver' } | null;
  onFechar: () => void;
  onConfirmar: (obs: string, foto: string | null) => void;
  ocupado: boolean;
}) {
  const [obs, setObs] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setObs('');
    setFoto(null);
    setErro(null);
  }, [dados?.os.id, dados?.acao]);

  if (!dados) return null;
  const executar = dados.acao === 'executar';

  const escolherFoto = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setProcessandoFoto(true);
    setErro(null);
    try {
      // Reduz a foto do celular para não pesar no banco nem na internet do campo
      const { dataUrl } = await compressImage(arquivo, 1280, 1280, 0.72);
      setFoto(dataUrl);
    } catch {
      setErro('Não foi possível usar esta foto. Tente outra.');
    } finally {
      setProcessandoFoto(false);
    }
  };

  const confirmar = () => {
    if (!executar && !obs.trim()) {
      setErro('Explique por que está devolvendo.');
      return;
    }
    onConfirmar(obs, foto);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !ocupado && onFechar()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900">
            {executar ? 'Serviço executado' : 'Devolver para a Secretaria'}
          </DialogTitle>
          <p className="text-xs text-gray-500 font-mono">{dados.os.protocolo}</p>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          {executar
            ? 'A Secretaria vai conferir e confirmar. Só depois disso o cidadão vê a O.S. como concluída.'
            : 'Use quando o serviço não é da sua equipe ou não dá para executar. A O.S. volta para a Secretaria encaminhar de novo.'}
        </p>

        <div>
          <Label className="text-sm font-semibold text-gray-700">
            {executar ? 'O que foi feito? (opcional)' : 'Motivo *'}
          </Label>
          <Textarea
            rows={3}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            maxLength={500}
            placeholder={executar ? 'Ex.: trocada a lâmpada e o reator' : 'Ex.: poste é da concessionária de energia'}
            className="mt-1 text-sm"
          />
        </div>

        {executar && (
          <div>
            <Label className="text-sm font-semibold text-gray-700">Foto do serviço (opcional)</Label>
            {foto ? (
              <div className="relative mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="Foto do serviço" className="w-full max-h-56 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => setFoto(null)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                  aria-label="Remover foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-600 active:bg-gray-50">
                {processandoFoto ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                {processandoFoto ? 'Preparando foto...' : 'Tirar ou escolher foto'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => escolherFoto(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
        )}

        {erro && <p className="text-sm text-red-700">{erro}</p>}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onFechar} disabled={ocupado} className="h-11">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={confirmar}
            disabled={ocupado || processandoFoto}
            className={`h-11 font-semibold text-white gap-1.5 ${
              executar ? 'bg-[#006653] hover:bg-[#005242]' : 'bg-gray-800 hover:bg-gray-900'
            }`}
          >
            {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
            {executar ? 'Enviar para confirmação' : 'Devolver O.S.'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
