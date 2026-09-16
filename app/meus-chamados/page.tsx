'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import {
  type Chamado,
  type ChamadoStatus,
  getStatusInfo,
  getCategoriaInfo,
  formatData,
  tempoRelativo,
  SECRETARIAS,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  MessageCircle,
  Copy,
  Check,
  ChevronRight,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  formatChamadoWhatsAppText,
  shareViaWhatsApp,
  copyToClipboard,
} from '@/lib/whatsapp-share';

export default function MeusChamadosPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChamadoStatus | 'TODOS'>('TODOS');
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareWhatsApp = (chamado: Chamado) => {
    const text = formatChamadoWhatsAppText({
      protocolo: chamado.protocolo,
      categoria: chamado.categoria,
      status: chamado.status,
      secretariaNome: chamado.secretaria ? SECRETARIAS[chamado.secretaria] : undefined,
      endereco: chamado.endereco_texto,
      descricao: chamado.descricao,
      created_at: chamado.created_at,
      resposta_cidadao: chamado.resposta_cidadao,
    });
    shareViaWhatsApp(text);
  };

  const handleCopyReceipt = async (chamado: Chamado) => {
    const text = formatChamadoWhatsAppText({
      protocolo: chamado.protocolo,
      categoria: chamado.categoria,
      status: chamado.status,
      secretariaNome: chamado.secretaria ? SECRETARIAS[chamado.secretaria] : undefined,
      endereco: chamado.endereco_texto,
      descricao: chamado.descricao,
      created_at: chamado.created_at,
      resposta_cidadao: chamado.resposta_cidadao,
    });
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(chamado.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session) return;

    (async () => {
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .eq('cidadao_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setChamados(data as Chamado[]);
      }
      setLoading(false);
    })();
  }, [session]);

  const filteredChamados = filter === 'TODOS' ? chamados : chamados.filter((c) => c.status === filter);

  const statusCounts = chamados.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (authLoading || (loading && session)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1E5BC6] animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#0A3A7A]">Meus Chamados</h1>
          <p className="text-gray-500 text-sm mt-1">{chamados.length} solicitação(ões) registrada(s)</p>
        </div>
        <Link href="/nova-solicitacao">
          <Button className="bg-[#1E5BC6] hover:bg-[#0A3A7A] text-white font-semibold h-11">
            <Plus className="w-4 h-4 mr-2" />
            Nova Solicitação
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['TODOS', 'ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-[#1E5BC6] text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : getStatusInfo(f as ChamadoStatus).label}
            {f !== 'TODOS' && statusCounts[f] ? (
              <span className="ml-1.5 text-xs opacity-70">({statusCounts[f]})</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredChamados.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Nenhuma solicitação encontrada</h3>
            <p className="text-sm text-gray-500 mb-6">Registre seu primeiro chamado de zelo urbano</p>
            <Link href="/nova-solicitacao">
              <Button className="bg-[#1E5BC6] hover:bg-[#0A3A7A] text-white font-semibold h-11 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Nova Solicitação
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredChamados.map((chamado) => {
            const statusInfo = getStatusInfo(chamado.status);
            const catInfo = getCategoriaInfo(chamado.categoria);
            const slaExpired = chamado.sla_limite && new Date(chamado.sla_limite) < new Date() && chamado.status !== 'RESOLVIDO' && chamado.status !== 'REJEITADO';

            return (
              <Card
                key={chamado.id}
                className="border-gray-200 hover:shadow-md transition-all overflow-hidden cursor-pointer hover:border-blue-300"
                onClick={() => setSelectedChamado(chamado)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Photo */}
                    <div className="w-full sm:w-36 h-36 sm:h-auto bg-gray-100 flex-shrink-0 relative">
                      {chamado.fotos && chamado.fotos.length > 0 ? (
                        <img src={chamado.fotos[0]} alt="Foto do chamado" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      {chamado.fotos && chamado.fotos.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          +{chamado.fotos.length - 1} foto(s)
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{catInfo?.emoji}</span>
                              <span className="font-semibold text-gray-800">{catInfo?.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono font-medium">{chamado.protocolo}</p>
                          </div>
                          <Badge className={`${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor} border shrink-0`}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{chamado.descricao}</p>

                        {/* Progress bar */}
                        <div className="space-y-1 mb-3">
                          <Progress value={statusInfo.progress} className="h-1.5" />
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {chamado.endereco_texto
                              ? chamado.endereco_texto.split(',').slice(0, 2).join(',')
                              : `${chamado.latitude.toFixed(4)}, ${chamado.longitude.toFixed(4)}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {tempoRelativo(chamado.created_at)}
                          </span>
                          {slaExpired && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              SLA vencido
                            </span>
                          )}
                          {chamado.status === 'RESOLVIDO' && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolvido
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Footer */}
                      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareWhatsApp(chamado);
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
                              handleCopyReceipt(chamado);
                            }}
                            className="text-xs h-8 px-2.5 rounded-md flex items-center gap-1 border-gray-200 hover:bg-gray-50 text-gray-700"
                          >
                            {copiedId === chamado.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span>{copiedId === chamado.id ? 'Copiado!' : 'Comprovante'}</span>
                          </Button>
                        </div>
                        <span className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                          Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Details Dialog Modal with WhatsApp & Comprovante */}
      {selectedChamado && (
        <Dialog open={!!selectedChamado} onOpenChange={(open) => !open && setSelectedChamado(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="text-left pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getCategoriaInfo(selectedChamado.categoria)?.emoji}</span>
                    <DialogTitle className="text-lg font-bold text-gray-900">
                      {getCategoriaInfo(selectedChamado.categoria)?.label}
                    </DialogTitle>
                  </div>
                  <p className="text-xs font-mono font-bold text-blue-600">
                    O.S. {selectedChamado.protocolo}
                  </p>
                </div>
                <Badge
                  className={`${getStatusInfo(selectedChamado.status).bgColor} ${
                    getStatusInfo(selectedChamado.status).borderColor
                  } ${getStatusInfo(selectedChamado.status).textColor} border shrink-0`}
                >
                  {getStatusInfo(selectedChamado.status).label}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Timeline status bar */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                  <span>Progresso do Atendimento</span>
                  <span>{getStatusInfo(selectedChamado.status).progress}%</span>
                </div>
                <Progress value={getStatusInfo(selectedChamado.status).progress} className="h-2" />
              </div>

              {/* Photos */}
              {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    Fotos Anexadas ({selectedChamado.fotos.length})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedChamado.fotos.map((foto, idx) => (
                      <a
                        key={idx}
                        href={foto}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200 hover:opacity-90 transition-opacity"
                      >
                        <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  Descrição do Cidadão
                </label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedChamado.descricao || 'Nenhuma descrição fornecida.'}
                </div>
              </div>

              {/* Official response from prefeitura if present */}
              {selectedChamado.resposta_cidadao && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs uppercase tracking-wide mb-1">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Resposta Oficial da Prefeitura
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {selectedChamado.resposta_cidadao}
                  </p>
                </div>
              )}

              {/* Metadata details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {selectedChamado.secretaria && (
                  <div className="flex items-start gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 block">Secretaria:</span>
                      <span className="font-semibold text-gray-800">
                        {SECRETARIAS[selectedChamado.secretaria] || selectedChamado.secretaria}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-400 block">Data de Abertura:</span>
                    <span className="font-medium text-gray-800">
                      {formatData(selectedChamado.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-400 block">Localização:</span>
                    <span className="font-medium text-gray-800">
                      {selectedChamado.endereco_texto || `${selectedChamado.latitude.toFixed(5)}, ${selectedChamado.longitude.toFixed(5)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Share & Copy Comprovante in Modal */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                  Compartilhar O.S.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    onClick={() => handleShareWhatsApp(selectedChamado)}
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold flex items-center justify-center gap-2 h-10 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Enviar no WhatsApp</span>
                  </Button>
                  <Button
                    onClick={() => handleCopyReceipt(selectedChamado)}
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-2 h-10"
                  >
                    {copiedId === selectedChamado.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                    <span>{copiedId === selectedChamado.id ? 'Comprovante Copiado!' : 'Copiar Comprovante'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
