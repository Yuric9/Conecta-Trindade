'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { getCategoriaInfo, normalizeCategoria, formatData, tempoRelativo } from '@/lib/types';
import { statusParaCidadao } from '@/lib/os-status';
import { ROTULO_CIDADAO, COR_CIDADAO, type StatusCidadao } from '@/lib/etapas-cidadao';
import { formatChamadoWhatsAppText, shareViaWhatsApp, copyToClipboard } from '@/lib/whatsapp-share';
import { assinarFotosDaLista } from '@/lib/fotos-os';
import { CategoriaIcone } from '@/components/categoria-icone';
import { LinhaTempoCidadao } from '@/components/linha-tempo-cidadao';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  FileText,
  MapPin,
  Clock,
  Loader2,
  Image as ImageIcon,
  MessageCircle,
  Copy,
  Check,
  ChevronRight,
  Building2,
  CheckCircle2,
} from 'lucide-react';

/** O pedido como o cidadão vê (sem nada interno da equipe) */
interface PedidoCidadao {
  id: string;
  protocolo: string;
  categoria: string;
  descricao: string;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  foto: string | null;
  status: string;
  resposta_cidadao: string | null;
  na_secretaria_em: string | null;
  encaminhado_em: string | null;
  concluido_em: string | null;
  foto_execucao_url: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Linha do banco (meus_chamados_v2) ou do modo demonstração → pedido */
function paraPedido(r: any): PedidoCidadao {
  const concluido = statusParaCidadao(r.status) === 'Concluído';
  return {
    id: r.id,
    protocolo: r.protocolo,
    categoria: r.categoria_servico ?? r.categoria,
    descricao: r.descricao || '',
    endereco: r.endereco ?? r.endereco_texto ?? null,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    foto: r.foto_url ?? r.fotos?.[0] ?? null,
    status: r.status,
    resposta_cidadao: r.resposta_cidadao ?? null,
    na_secretaria_em: r.na_secretaria_em ?? null,
    encaminhado_em: r.encaminhado_em ?? null,
    concluido_em: r.concluido_em ?? null,
    // A foto do serviço feito só aparece depois de concluída
    foto_execucao_url: concluido ? r.foto_execucao_url ?? null : null,
    created_at: r.created_at,
    updated_at: r.updated_at ?? null,
  };
}

const fotoSegura = (url: string | null) => (url && /^(https:\/\/|data:image\/)/.test(url) ? url : null);
/** Foto que não abre (link quebrado): some, em vez de mostrar o ícone quebrado */
const esconderSeFalhar = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

const FILTROS: ('TODOS' | StatusCidadao)[] = ['TODOS', 'Pendente', 'Em Andamento', 'Concluído', 'Cancelado'];

export default function MeusChamadosPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoCidadao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | StatusCidadao>('TODOS');
  const [aberto, setAberto] = useState<PedidoCidadao | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const textoComprovante = (p: PedidoCidadao) =>
    formatChamadoWhatsAppText({
      protocolo: p.protocolo,
      categoria: p.categoria,
      status: p.status,
      endereco: p.endereco || undefined,
      descricao: p.descricao,
      created_at: p.created_at,
      resposta_cidadao: p.resposta_cidadao || undefined,
    });

  const copiarComprovante = async (p: PedidoCidadao) => {
    if (await copyToClipboard(textoComprovante(p))) {
      setCopiado(p.id);
      setTimeout(() => setCopiado(null), 3000);
    }
  };

  useEffect(() => {
    if (!authLoading && !session) router.push('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      if (isSupabaseConfigured) {
        // Função do banco: só os pedidos da própria conta, sem nada interno da equipe
        let { data, error } = await (supabase as any).rpc('meus_chamados_v2');
        if (error) {
          // Banco ainda sem a versão nova: usa a anterior (sem as datas das etapas)
          ({ data, error } = await (supabase as any).rpc('meus_chamados'));
        }
        if (error) {
          console.error('Erro ao carregar meus chamados:', error);
          setErro('Não foi possível carregar seus pedidos. Tente de novo em instantes.');
        } else {
          // Fotos do Storage: links temporários (o banco confere que o pedido é seu)
          setPedidos(await assinarFotosDaLista(supabase as any, ((data as any[]) || []).map(paraPedido), ['foto', 'foto_execucao_url']));
        }
      } else {
        // Modo demonstração: dados guardados no navegador
        const { data } = await supabase
          .from('chamados')
          .select('*')
          .eq('cidadao_id', session.user.id)
          .order('created_at', { ascending: false });
        setPedidos(((data as any[]) || []).map(paraPedido));
      }
      setLoading(false);
    })();
  }, [session]);

  const contagem = pedidos.reduce(
    (acc, p) => {
      const s = statusParaCidadao(p.status);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<StatusCidadao, number>>
  );
  const visiveis = filtro === 'TODOS' ? pedidos : pedidos.filter((p) => statusParaCidadao(p.status) === filtro);

  if (authLoading || (loading && session)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#006653] animate-spin" />
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#005242]">Meus Chamados</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pedidos.length === 1 ? '1 pedido registrado' : `${pedidos.length} pedidos registrados`}
          </p>
        </div>
        <Link href="/solicitar">
          <Button className="bg-[#006653] hover:bg-[#005242] text-white font-semibold h-11">
            <Plus className="w-4 h-4 mr-2" />
            Nova Solicitação
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filtro === f ? 'bg-[#006653] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : ROTULO_CIDADAO[f]}
            {f !== 'TODOS' && contagem[f] ? <span className="ml-1.5 text-xs opacity-70">({contagem[f]})</span> : null}
          </button>
        ))}
      </div>

      {erro && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900">{erro}</div>}

      {visiveis.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">
              {pedidos.length === 0 ? 'Você ainda não fez nenhum pedido' : 'Nenhum pedido nesta situação'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">Viu um problema na rua? Registre aqui e acompanhe cada etapa.</p>
            <Link href="/solicitar">
              <Button className="bg-[#006653] hover:bg-[#005242] text-white font-semibold h-11 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Nova Solicitação
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visiveis.map((p) => {
            const s = statusParaCidadao(p.status);
            const cat = getCategoriaInfo(normalizeCategoria(p.categoria));
            const foto = fotoSegura(p.foto_execucao_url) || fotoSegura(p.foto);
            return (
              <Card
                key={p.id}
                className="border-gray-200 hover:shadow-md transition-all overflow-hidden cursor-pointer hover:border-emerald-300"
                onClick={() => setAberto(p)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-36 h-36 sm:h-auto bg-gray-100 flex-shrink-0 relative">
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto} alt="Foto do pedido" onError={esconderSeFalhar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      {fotoSegura(p.foto_execucao_url) && (
                        <span className="absolute bottom-2 left-2 bg-[#006653] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          Serviço feito
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CategoriaIcone categoria={cat.id} className="w-6 h-6" />
                              <span className="font-semibold text-gray-800">{cat.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono font-medium">{p.protocolo}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR_CIDADAO[s]}`}>
                            {ROTULO_CIDADAO[s]}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.descricao}</p>

                        {p.resposta_cidadao && (
                          <p className="mb-3 flex items-start gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
                            <Building2 className="w-3.5 h-3.5 shrink-0 mt-px" />
                            <span className="line-clamp-2">
                              <strong>Resposta da Prefeitura:</strong> {p.resposta_cidadao}
                            </span>
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {p.endereco
                              ? p.endereco.split(',').slice(0, 2).join(',')
                              : p.latitude !== null && p.longitude !== null
                                ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                                : 'Sem endereço'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {tempoRelativo(p.created_at)}
                          </span>
                          {s === 'Concluído' && p.concluido_em && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Concluído em {formatData(p.concluido_em).slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareViaWhatsApp(textoComprovante(p));
                            }}
                            className="bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs h-8 px-3 rounded-md flex items-center gap-1.5 shadow-sm font-medium"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarComprovante(p);
                            }}
                            className="text-xs h-8 px-2.5 rounded-md flex items-center gap-1 border-gray-200 hover:bg-gray-50 text-gray-700"
                          >
                            {copiado === p.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                            <span>{copiado === p.id ? 'Copiado!' : 'Comprovante'}</span>
                          </Button>
                        </div>
                        <span className="text-xs text-emerald-700 font-medium flex items-center gap-0.5">
                          Ver andamento <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {aberto && (
        <Dialog open onOpenChange={(v) => !v && setAberto(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="text-left pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CategoriaIcone categoria={normalizeCategoria(aberto.categoria)} className="w-6 h-6" />
                    <DialogTitle className="text-lg font-bold text-gray-900">
                      {getCategoriaInfo(normalizeCategoria(aberto.categoria)).label}
                    </DialogTitle>
                  </div>
                  <p className="text-xs font-mono font-bold text-emerald-700">Protocolo {aberto.protocolo}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR_CIDADAO[statusParaCidadao(aberto.status)]}`}
                >
                  {ROTULO_CIDADAO[statusParaCidadao(aberto.status)]}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Andamento</h3>
                <LinhaTempoCidadao pedido={aberto} />
              </section>

              {aberto.resposta_cidadao && (
                <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5">
                  <p className="flex items-center gap-1.5 text-emerald-950 font-semibold text-xs uppercase tracking-wide mb-1">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    Resposta da Prefeitura
                  </p>
                  <p className="text-sm text-emerald-950 leading-relaxed whitespace-pre-line">{aberto.resposta_cidadao}</p>
                </section>
              )}

              {fotoSegura(aberto.foto_execucao_url) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Foto do serviço feito</h3>
                  <a href={aberto.foto_execucao_url!} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={aberto.foto_execucao_url!}
                      alt="Foto do serviço executado"
                      onError={esconderSeFalhar}
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
                    />
                  </a>
                </section>
              )}

              {fotoSegura(aberto.foto) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sua foto</h3>
                  <a href={aberto.foto!} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aberto.foto!} alt="Foto enviada" onError={esconderSeFalhar} className="w-full max-h-56 object-cover rounded-lg border border-gray-200" />
                  </a>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">O que você pediu</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
                  {aberto.descricao || 'Sem descrição.'}
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  {aberto.endereco ||
                    (aberto.latitude !== null && aberto.longitude !== null
                      ? `${aberto.latitude.toFixed(5)}, ${aberto.longitude.toFixed(5)}`
                      : 'Sem endereço')}
                </p>
              </section>

              <section className="pt-2 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    onClick={() => shareViaWhatsApp(textoComprovante(aberto))}
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold flex items-center justify-center gap-2 h-10 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    Enviar no WhatsApp
                  </Button>
                  <Button
                    onClick={() => copiarComprovante(aberto)}
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-2 h-10"
                  >
                    {copiado === aberto.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    {copiado === aberto.id ? 'Comprovante copiado!' : 'Copiar comprovante'}
                  </Button>
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
