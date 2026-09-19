'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Calendar,
  Phone,
  User,
  Copy,
  Check,
  Share2,
  Printer,
  ChevronRight,
  ArrowLeft,
  X,
  Eye,
  Building2,
  ImageIcon,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStoredChamadosList } from '@/lib/supabase/client';
import { formatData, tempoRelativo, getCategoriaInfo, SECRETARIAS, type ChamadoCategoria } from '@/lib/types';

// =====================================================================
// Tipos e Normalização de Status
// =====================================================================

type NormalizedStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

function normalizeStatus(status: string | undefined | null): NormalizedStatus {
  if (!status) return 'Pendente';
  const s = status.toUpperCase().trim();
  if (s === 'ABERTO' || s === 'TRIADO' || s === 'PENDENTE') return 'Pendente';
  if (s === 'EM_ANDAMENTO' || s === 'EM ANDAMENTO' || s === 'ANDAMENTO') return 'Em Andamento';
  if (s === 'RESOLVIDO' || s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'AVALIADO') return 'Concluído';
  if (s === 'REJEITADO' || s === 'CANCELADO') return 'Cancelado';
  return 'Pendente';
}

interface ChamadoDetalhe {
  id: string;
  protocolo: string;
  nome_cidadao?: string;
  cidadao_nome?: string;
  cpf_cidadao?: string;
  telefone_cidadao?: string;
  cidadao_telefone?: string;
  categoria_servico?: string;
  categoria?: string;
  descricao: string;
  endereco?: string;
  endereco_texto?: string;
  foto_url?: string | null;
  fotos?: string[];
  status: string;
  secretaria?: string | null;
  observacoes_internas?: string | null;
  created_at: string;
  updated_at?: string;
  sla_limite?: string;
}

// Chips de exemplo para teste rápido do cidadão
const EXEMPLOS_BUSCA = [
  { tipo: 'protocolo', valor: 'TRIN-2026-1001', label: 'TRIN-2026-1001 (Iluminação - Pendente)' },
  { tipo: 'protocolo', valor: 'TRIN-2026-5088', label: 'TRIN-2026-5088 (Roçagem - Em Andamento)' },
  { tipo: 'protocolo', valor: 'TRIN-2026-2045', label: 'TRIN-2026-2045 (Tapa-Buracos - Em Andamento)' },
  { tipo: 'protocolo', valor: 'TRIN-2026-3190', label: 'TRIN-2026-3190 (Limpeza - Concluído)' },
  { tipo: 'cpf', valor: '123.456.789-00', label: 'CPF: 123.456.789-00' },
];

function AcompanharContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados da busca
  const [termoBusca, setTermoBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resultados
  const [chamadoSelecionado, setChamadoSelecionado] = useState<ChamadoDetalhe | null>(null);
  const [listaResultados, setListaResultados] = useState<ChamadoDetalhe[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  // Feedback do usuário
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  // Execução de busca na API e no fallback local
  const executarBusca = useCallback(async (termoOriginal: string) => {
    const termo = termoOriginal.trim();
    if (!termo) {
      setErrorMsg('Por favor, digite o número do protocolo ou CPF para realizar a consulta.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setBuscaRealizada(true);

    try {
      // 1. Chamar a rota de API GET /api/chamados/[protocolo]
      const url = `/api/chamados/${encodeURIComponent(termo)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.success) {
        if (Array.isArray(data.chamados) && data.chamados.length > 1) {
          setListaResultados(data.chamados);
          setChamadoSelecionado(data.chamado || data.chamados[0]);
        } else if (data.chamado) {
          setListaResultados([data.chamado]);
          setChamadoSelecionado(data.chamado);
        } else {
          setListaResultados([]);
          setChamadoSelecionado(null);
          setErrorMsg(data.error || `Nenhuma solicitação encontrada para "${termo}".`);
        }
        setLoading(false);
        return;
      }

      // 2. Se a rota dinâmica retornar 404, tentar buscar no storage local do navegador
      const storedLocal = getStoredChamadosList();
      const cleanDigits = termo.replace(/\D/g, '');
      const localMatches = storedLocal.filter((c) => {
        const protoMatch = c.protocolo?.toLowerCase().includes(termo.toLowerCase());
        const idMatch = c.id?.toLowerCase().includes(termo.toLowerCase());
        const cpfMatch = cleanDigits.length >= 8 && ((c as any).cpf_cidadao || '').replace(/\D/g, '').includes(cleanDigits);
        return protoMatch || idMatch || cpfMatch;
      });

      if (localMatches.length > 0) {
        const converted: ChamadoDetalhe[] = localMatches.map((item) => ({
          id: item.id,
          protocolo: item.protocolo,
          nome_cidadao: item.cidadao_nome || (item as any).nome_cidadao || 'Munícipe',
          cpf_cidadao: (item as any).cpf_cidadao,
          telefone_cidadao: item.cidadao_telefone || (item as any).telefone_cidadao,
          categoria_servico: item.categoria,
          descricao: item.descricao,
          endereco: item.endereco_texto,
          foto_url: item.fotos && item.fotos.length > 0 ? item.fotos[0] : null,
          fotos: item.fotos || [],
          status: item.status,
          secretaria: item.secretaria,
          observacoes_internas: item.observacoes_internas,
          created_at: item.created_at,
          updated_at: item.updated_at,
          sla_limite: item.sla_limite,
        }));

        setListaResultados(converted);
        setChamadoSelecionado(converted[0]);
        setLoading(false);
        return;
      }

      // Se nenhum registro foi encontrado
      setListaResultados([]);
      setChamadoSelecionado(null);
      setErrorMsg(
        data?.error ||
          `Nenhuma solicitação encontrada para "${termo}". Verifique se os números do protocolo ou CPF estão corretos.`
      );
    } catch (err: any) {
      console.error('Erro ao consultar chamado:', err);
      setErrorMsg('Ocorreu uma instabilidade na consulta. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Leitura de parâmetro inicial via URL (ex: /acompanhar?protocolo=TRIN-2026-1001)
  useEffect(() => {
    const protoUrl =
      searchParams.get('protocolo') ||
      searchParams.get('p') ||
      searchParams.get('cpf') ||
      searchParams.get('busca');

    if (protoUrl) {
      setTermoBusca(protoUrl);
      executarBusca(protoUrl);
    }
  }, [searchParams, executarBusca]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termoBusca.trim()) return;

    // Atualiza a URL de forma amigável
    router.replace(`/acompanhar?protocolo=${encodeURIComponent(termoBusca.trim())}`);
    executarBusca(termoBusca);
  };

  const handleCopiarProtocolo = (protocolo: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(protocolo);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 2200);
    }
  };

  const handleCompartilharWhatsApp = (chamado: ChamadoDetalhe) => {
    const statusAtual = normalizeStatus(chamado.status);
    const texto = `Olá! Acompanhe o andamento da minha solicitação de zelo urbano em Trindade-GO:\n\n*Protocolo:* ${chamado.protocolo}\n*Serviço:* ${chamado.categoria_servico || chamado.categoria || 'Demanda Municipal'}\n*Status Atual:* ${statusAtual}\n*Endereço:* ${chamado.endereco || chamado.endereco_texto || 'Trindade - GO'}\n\nConsulte o andamento em tempo real no portal Conecta Trindade: ${window.location.origin}/acompanhar?protocolo=${encodeURIComponent(chamado.protocolo)}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const statusNorm = normalizeStatus(chamadoSelecionado?.status);

  // Fotos do chamado
  const fotosExibicao = chamadoSelecionado?.fotos?.length
    ? chamadoSelecionado.fotos
    : chamadoSelecionado?.foto_url
    ? [chamadoSelecionado.foto_url]
    : [];

  return (
    <div className="bg-[#eef1ef] min-h-[calc(100vh-140px)] pb-16">
      {/* Header oficial de consulta pública */}
      <section className="bg-gradient-to-r from-[#006653] to-[#004d3e] text-white py-10 px-4 shadow-sm relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-100 border border-white/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFC20E]" />
            <span>Portal Oficial do Cidadão · Prefeitura de Trindade</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading tracking-tight mb-3">
            Acompanhar Solicitação
          </h1>
          <p className="text-emerald-100 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Consulte em tempo real o andamento e os prazos da sua demanda de zelo urbano através do
            número de protocolo ou CPF cadastrado.
          </p>
        </div>
      </section>

      {/* Caixa de Busca com Alto Contraste */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <Card className="border border-emerald-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Digite o Protocolo (ex: TRIN-2026-1001) ou CPF..."
                  className="pl-11 pr-10 h-12 text-sm bg-gray-50/70 border-gray-300 focus-visible:ring-[#006653] focus-visible:border-[#006653] font-medium rounded-xl"
                  autoFocus
                />
                {termoBusca && (
                  <button
                    type="button"
                    onClick={() => {
                      setTermoBusca('');
                      setErrorMsg(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    title="Limpar campo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !termoBusca.trim()}
                className="w-full sm:w-auto h-12 px-7 bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 font-bold text-sm shadow-sm gap-2 rounded-xl flex-shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#173b32]" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Buscar Demanda</span>
                  </>
                )}
              </Button>
            </form>

            {/* Chips de teste rápido */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-[#006653]" />
                Exemplos para consulta rápida:
              </span>
              {EXEMPLOS_BUSCA.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTermoBusca(item.valor);
                    router.replace(`/acompanhar?protocolo=${encodeURIComponent(item.valor)}`);
                    executarBusca(item.valor);
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-[#006653] border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal da Consulta */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Mensagem de Erro / Não encontrado */}
        {errorMsg && (
          <Card className="border-red-200 bg-red-50/60 shadow-xs mb-6 rounded-xl animate-fade-in">
            <CardContent className="p-5 flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-900">Solicitação não localizada</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">{errorMsg}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTermoBusca('TRIN-2026-1001');
                      executarBusca('TRIN-2026-1001');
                    }}
                    className="bg-white border-red-200 text-red-800 hover:bg-red-50 text-xs h-8"
                  >
                    Testar com protocolo TRIN-2026-1001
                  </Button>
                  <Link href="/solicitar">
                    <Button size="sm" className="bg-[#006653] hover:bg-[#005242] text-white text-xs h-8 gap-1">
                      <PlusCircle className="w-3.5 h-3.5" />
                      Registrar Nova Solicitação
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista seletora caso a busca por CPF retorne múltiplos chamados */}
        {listaResultados.length > 1 && (
          <Card className="border-gray-200 shadow-sm bg-white mb-6 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/80 border-b border-gray-100 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center justify-between">
                <span>Solicitações encontradas para este CPF ({listaResultados.length})</span>
                <span className="text-xs font-normal text-gray-500">
                  Selecione uma para visualizar a linha do tempo
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100">
              {listaResultados.map((item) => {
                const isSelected = chamadoSelecionado?.protocolo === item.protocolo;
                const statusItem = normalizeStatus(item.status);
                return (
                  <button
                    key={item.id || item.protocolo}
                    type="button"
                    onClick={() => setChamadoSelecionado(item)}
                    className={`w-full text-left p-4 flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-[#006653]'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-xs text-[#006653] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.protocolo}
                        </span>
                        <StatusBadgeItem status={statusItem} />
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{formatData(item.created_at)}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {item.categoria_servico || item.categoria || 'Demanda'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {item.endereco || item.endereco_texto || 'Trindade - GO'}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#006653]' : 'text-gray-300'}`}
                    />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ============================================================= */}
        {/* Resultado: Detalhes e Linha do Tempo de Status                */}
        {/* ============================================================= */}
        {chamadoSelecionado && (
          <div className="space-y-6 animate-fade-in">
            {/* Card Principal: Cabeçalho do Protocolo e Status */}
            <Card className="border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
              <div className="p-5 md:p-6 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ordem de Serviço
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#006653]" />
                      Registrada em {formatData(chamadoSelecionado.created_at)} ({tempoRelativo(chamadoSelecionado.created_at)})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-mono font-black text-[#006653] tracking-wide">
                      {chamadoSelecionado.protocolo}
                    </h2>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopiarProtocolo(chamadoSelecionado.protocolo)}
                      className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1 rounded-lg"
                      title="Copiar número do protocolo"
                    >
                      {copiedProtocol ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadgeItem status={statusNorm} size="lg" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompartilharWhatsApp(chamadoSelecionado)}
                    className="h-9 text-xs border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 gap-1.5 rounded-lg"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="h-9 text-xs border-gray-300 text-gray-700 hover:bg-gray-100 gap-1.5 rounded-lg"
                    title="Imprimir comprovante"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </Button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* LINHA DO TEMPO OFICIAL DE STATUS                         */}
              {/* Requisito 3: (Pendente -> Em Andamento -> Concluído)      */}
              {/* ========================================================= */}
              <div className="p-5 md:p-8 bg-white border-b border-gray-100">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#006653]" />
                    Linha do Tempo de Atendimento
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Acompanhe as etapas de execução da sua solicitação pela Prefeitura de Trindade
                  </p>
                </div>

                {/* Caso Especial: Cancelado / Rejeitado */}
                {statusNorm === 'Cancelado' ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 text-left">
                    <div className="flex items-center gap-2.5 text-gray-800 font-bold text-sm mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Solicitação Cancelada / Indeferida</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Esta ordem de serviço foi cancelada ou julgada inviável durante a triagem técnica.
                      {chamadoSelecionado.observacoes_internas && (
                        <span className="block mt-2 font-medium text-gray-800 bg-white p-2.5 rounded border border-gray-200">
                          <strong>Parecer da Fiscalização:</strong> {chamadoSelecionado.observacoes_internas}
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  /* Linha do Tempo Progressiva Oficial */
                  <div className="relative mt-2">
                    {/* Barra de Conexão entre os Marcos */}
                    <div className="hidden md:block absolute top-6 left-12 right-12 h-1.5 bg-gray-200 rounded-full z-0">
                      <div
                        className="h-full bg-[#006653] rounded-full transition-all duration-700 ease-in-out"
                        style={{
                          width:
                            statusNorm === 'Concluído'
                              ? '100%'
                              : statusNorm === 'Em Andamento'
                              ? '50%'
                              : '0%',
                        }}
                      />
                    </div>

                    {/* Grade dos 3 Marcos Obrigatórios */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                      {/* Marco 1: Pendente */}
                      <TimelineStep
                        numero="1"
                        titulo="Pendente"
                        subtitulo="Solicitação Registrada"
                        descricao="Demanda protocolada no sistema Conecta-Trindade e aguardando triagem da secretaria competente."
                        ativo={statusNorm === 'Pendente'}
                        concluido={statusNorm === 'Em Andamento' || statusNorm === 'Concluído'}
                        corAtiva="yellow"
                        dataRef={chamadoSelecionado.created_at}
                      />

                      {/* Marco 2: Em Andamento */}
                      <TimelineStep
                        numero="2"
                        titulo="Em Andamento"
                        subtitulo="Equipe em Campo"
                        descricao="Demanda despachada para a secretaria responsável. Equipe técnica operacional designada para o local."
                        ativo={statusNorm === 'Em Andamento'}
                        concluido={statusNorm === 'Concluído'}
                        corAtiva="blue"
                        dataRef={statusNorm === 'Em Andamento' ? chamadoSelecionado.updated_at : undefined}
                      />

                      {/* Marco 3: Concluído */}
                      <TimelineStep
                        numero="3"
                        titulo="Concluído"
                        subtitulo="Demanda Finalizada"
                        descricao="Serviço executado com sucesso e vistoriado pela fiscalização de zelo urbano de Trindade."
                        ativo={statusNorm === 'Concluído'}
                        concluido={statusNorm === 'Concluído'}
                        corAtiva="emerald"
                        dataRef={statusNorm === 'Concluído' ? chamadoSelecionado.updated_at : undefined}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Detalhes Completos da Solicitação */}
              <div className="p-5 md:p-8">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#006653]" />
                  Informações da Ocorrência
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-700">
                  {/* Coluna 1: Dados do Serviço e Local */}
                  <div className="space-y-4">
                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[11px] uppercase tracking-wider font-semibold mb-1">
                        Serviço / Categoria
                      </span>
                      <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                        {(() => {
                          const catInfo = getCategoriaInfo(
                            chamadoSelecionado.categoria_servico || chamadoSelecionado.categoria || ''
                          );
                          return (
                            <>
                              <span className="text-xl p-1 rounded-lg bg-emerald-50 border border-emerald-100">
                                {catInfo.emoji}
                              </span>
                              <span>
                                {chamadoSelecionado.categoria_servico ||
                                  catInfo.label ||
                                  'Serviço Urbano'}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[11px] uppercase tracking-wider font-semibold mb-1">
                        Localização / Endereço
                      </span>
                      <div className="flex items-start gap-2 text-gray-900 font-medium">
                        <MapPin className="w-4 h-4 text-[#006653] flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {chamadoSelecionado.endereco ||
                            chamadoSelecionado.endereco_texto ||
                            'Trindade - GO'}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            (chamadoSelecionado.endereco || chamadoSelecionado.endereco_texto || 'Trindade GO') +
                              ', Trindade, GO'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006653] hover:underline"
                        >
                          <span>Ver rota no Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {chamadoSelecionado.secretaria && (
                      <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[11px] uppercase tracking-wider font-semibold mb-1">
                          Secretaria Responsável
                        </span>
                        <p className="font-semibold text-gray-900">
                          {SECRETARIAS[chamadoSelecionado.secretaria as keyof typeof SECRETARIAS] ||
                            chamadoSelecionado.secretaria}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Coluna 2: Solicitante e Descrição */}
                  <div className="space-y-4">
                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[11px] uppercase tracking-wider font-semibold mb-1">
                        Cidadão Solicitante
                      </span>
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>
                          {chamadoSelecionado.nome_cidadao ||
                            chamadoSelecionado.cidadao_nome ||
                            'Cidadão Trindadense'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-gray-500 text-[11px]">
                        {chamadoSelecionado.cpf_cidadao && (
                          <span>
                            CPF: {mascararCpf(chamadoSelecionado.cpf_cidadao)}
                          </span>
                        )}
                        {(chamadoSelecionado.telefone_cidadao ||
                          chamadoSelecionado.cidadao_telefone) && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {chamadoSelecionado.telefone_cidadao ||
                              chamadoSelecionado.cidadao_telefone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[11px] uppercase tracking-wider font-semibold mb-1">
                        Descrição do Problema
                      </span>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap font-normal">
                        {chamadoSelecionado.descricao || 'Sem descrição detalhada fornecida.'}
                      </p>
                    </div>

                    {/* Parecer do fiscal / Observações se houver */}
                    {chamadoSelecionado.observacoes_internas && (
                      <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                        <span className="text-[#006653] block text-[11px] uppercase tracking-wider font-bold mb-1">
                          Despacho e Parecer Técnico
                        </span>
                        <p className="text-emerald-950 font-medium leading-relaxed">
                          {chamadoSelecionado.observacoes_internas}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fotos Anexadas */}
                {fotosExibicao.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#006653]" />
                      Fotos Registradas na Abertura ({fotosExibicao.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {fotosExibicao.map((foto, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFotoModalUrl(foto)}
                          className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group hover:border-[#006653] transition-all shadow-2xs"
                        >
                          <img
                            src={foto}
                            alt={`Evidência fotográfica ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" />
                            <span>Ampliar</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé de Ações de Suporte ao Cidadão */}
              <div className="p-4 sm:p-5 bg-gray-50/90 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-gray-600 text-center sm:text-left">
                  <ShieldCheck className="w-4 h-4 text-[#006653] flex-shrink-0" />
                  <span>
                    Dúvidas sobre sua demanda? Ouvidoria Municipal de Trindade: <strong>(62) 3506-7000</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChamadoSelecionado(null);
                      setListaResultados([]);
                      setTermoBusca('');
                      router.replace('/acompanhar');
                    }}
                    className="text-xs border-gray-300 text-gray-700 hover:bg-white w-full sm:w-auto"
                  >
                    Nova Consulta
                  </Button>
                  <Link href="/solicitar" className="w-full sm:w-auto">
                    <Button size="sm" className="bg-[#006653] hover:bg-[#005242] text-white text-xs w-full sm:w-auto gap-1">
                      <PlusCircle className="w-3.5 h-3.5" />
                      Novo Chamado
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Estado inicial / Como funciona quando nenhuma busca foi feita */}
        {!buscaRealizada && !chamadoSelecionado && (
          <div className="mt-8 space-y-6 animate-fade-in">
            <Card className="border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-bold text-[#006653] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Como funciona a consulta de solicitações?
                </CardTitle>
                <CardDescription className="text-xs text-gray-600">
                  O sistema municipal Conecta Trindade atualiza os status das ordens de serviço em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 md:p-6 grid sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                  <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-xs mb-2">
                    1
                  </span>
                  <h4 className="font-bold text-amber-950 text-sm mb-1">🟡 Pendente</h4>
                  <p className="text-amber-800 leading-relaxed">
                    Sua solicitação foi registrada no banco de dados e aguarda a triagem pela equipe técnica da secretaria responsável.
                  </p>
                </div>

                <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                  <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-900 font-bold flex items-center justify-center text-xs mb-2">
                    2
                  </span>
                  <h4 className="font-bold text-blue-950 text-sm mb-1">🔵 Em Andamento</h4>
                  <p className="text-blue-800 leading-relaxed">
                    A ordem de serviço foi despachada para a equipe de campo ou empresa prestadora e está em fase de execução física.
                  </p>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                  <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-xs mb-2">
                    3
                  </span>
                  <h4 className="font-bold text-emerald-950 text-sm mb-1">🟢 Concluído</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    O serviço foi finalizado e vistoriado pela fiscalização municipal, resolvendo o problema no endereço indicado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de visualização ampliada de foto */}
      <Dialog open={Boolean(fotoModalUrl)} onOpenChange={() => setFotoModalUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-gray-800 text-white">
          <DialogHeader className="p-2 flex flex-row items-center justify-between">
            <DialogTitle className="text-xs font-semibold text-gray-300">
              Registro Fotográfico da Ocorrência
            </DialogTitle>
          </DialogHeader>
          {fotoModalUrl && (
            <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-lg bg-black">
              <img
                src={fotoModalUrl}
                alt="Foto ampliada da solicitação"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AcompanharPage() {
  return (
    <React.Suspense
      fallback={
        <div className="bg-[#eef1ef] min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="flex items-center gap-2 text-[#006653] font-semibold text-sm">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Carregando portal de acompanhamento...</span>
          </div>
        </div>
      }
    >
      <AcompanharContent />
    </React.Suspense>
  );
}

// =====================================================================
// Componentes Auxiliares da Linha do Tempo e Badges
// =====================================================================

interface TimelineStepProps {
  numero: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  ativo: boolean;
  concluido: boolean;
  corAtiva: 'yellow' | 'blue' | 'emerald';
  dataRef?: string;
}

function TimelineStep({
  numero,
  titulo,
  subtitulo,
  descricao,
  ativo,
  concluido,
  corAtiva,
  dataRef,
}: TimelineStepProps) {
  return (
    <div
      className={`rounded-2xl p-4 border transition-all relative ${
        concluido
          ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
          : ativo
          ? corAtiva === 'yellow'
            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
            : corAtiva === 'blue'
            ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/40 shadow-sm'
            : 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
          : 'bg-gray-50/50 border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3 mb-2.5">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs transition-colors ${
            concluido
              ? 'bg-[#006653] text-white'
              : ativo
              ? corAtiva === 'yellow'
                ? 'bg-amber-500 text-white animate-pulse'
                : corAtiva === 'blue'
                ? 'bg-blue-600 text-white animate-pulse'
                : 'bg-[#006653] text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {concluido ? <Check className="w-5 h-5 stroke-[2.5]" /> : numero}
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold block text-gray-500">
            Etapa {numero}
          </span>
          <h4
            className={`font-heading font-bold text-sm ${
              concluido
                ? 'text-emerald-900'
                : ativo
                ? corAtiva === 'yellow'
                  ? 'text-amber-950'
                  : corAtiva === 'blue'
                  ? 'text-blue-950'
                  : 'text-emerald-950'
                : 'text-gray-600'
            }`}
          >
            {titulo}
          </h4>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-800 mb-1">{subtitulo}</p>
      <p className="text-[11.5px] text-gray-600 leading-relaxed">{descricao}</p>

      {dataRef && (
        <div className="mt-3 pt-2 border-t border-gray-200/60 text-[10.5px] text-gray-500 flex items-center gap-1 font-medium">
          <Clock className="w-3 h-3 text-gray-400" />
          <span>{formatData(dataRef)}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadgeItem({
  status,
  size = 'md',
}: {
  status: NormalizedStatus;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses =
    size === 'lg'
      ? 'text-xs px-3 py-1 font-bold'
      : size === 'sm'
      ? 'text-[10px] px-2 py-0.5 font-semibold'
      : 'text-[11px] px-2.5 py-0.5 font-semibold';

  switch (status) {
    case 'Pendente':
      return (
        <Badge
          className={`bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100 ${sizeClasses} gap-1.5 shadow-2xs`}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>Pendente</span>
        </Badge>
      );
    case 'Em Andamento':
      return (
        <Badge
          className={`bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 ${sizeClasses} gap-1.5 shadow-2xs`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Em Andamento</span>
        </Badge>
      );
    case 'Concluído':
      return (
        <Badge
          className={`bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 ${sizeClasses} gap-1.5 shadow-2xs`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Concluído</span>
        </Badge>
      );
    case 'Cancelado':
      return (
        <Badge
          className={`bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 ${sizeClasses} gap-1.5 shadow-2xs`}
        >
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Cancelado</span>
        </Badge>
      );
  }
}

function mascararCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.***.***-${clean.slice(9, 11)}`;
  }
  return cpf;
}
