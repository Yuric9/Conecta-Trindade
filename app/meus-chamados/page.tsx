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
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

export default function MeusChamadosPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChamadoStatus | 'TODOS'>('TODOS');

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
              <Card key={chamado.id} className="border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Photo */}
                    <div className="w-full sm:w-32 h-32 bg-gray-100 flex-shrink-0 relative">
                      {chamado.fotos && chamado.fotos.length > 0 ? (
                        <img src={chamado.fotos[0]} alt="Foto do chamado" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{catInfo?.emoji}</span>
                            <span className="font-semibold text-gray-800">{catInfo?.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{chamado.protocolo}</p>
                        </div>
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor} border`}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{chamado.descricao}</p>

                      {/* Progress bar */}
                      <div className="space-y-1 mb-3">
                        <Progress value={statusInfo.progress} className="h-1.5" />
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {chamado.endereco_texto
                            ? chamado.endereco_texto.split(',').slice(0, 2).join(',')
                            : `${chamado.latitude.toFixed(4)}, ${chamado.longitude.toFixed(4)}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
