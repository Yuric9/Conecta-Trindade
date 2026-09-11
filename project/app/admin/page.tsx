'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import {
  type Chamado,
  type ChamadoStatus,
  type ChamadoCategoria,
  type ChamadoSecretaria,
  getStatusInfo,
  getCategoriaInfo,
  formatData,
  tempoRelativo,
  SECRETARIAS,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const AdminMap = dynamic(() => import('@/components/admin-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Carregando mapa...</div>
    </div>
  ),
});
import {
  LayoutDashboard,
  Map as MapIcon,
  Filter,
  Clock,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const KANBAN_COLUMNS: { status: ChamadoStatus; label: string; color: string }[] = [
  { status: 'ABERTO', label: 'Aberto', color: 'amber' },
  { status: 'TRIADO', label: 'Triado', color: 'purple' },
  { status: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'blue' },
  { status: 'RESOLVIDO', label: 'Resolvido', color: 'green' },
];

export default function AdminPage() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'mapa'>('kanban');
  const [filterCategoria, setFilterCategoria] = useState<ChamadoCategoria | 'TODAS'>('TODAS');
  const [filterAtrasado, setFilterAtrasado] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [newStatus, setNewStatus] = useState<ChamadoStatus>('ABERTO');
  const [newSecretaria, setNewSecretaria] = useState<ChamadoSecretaria | 'NONE'>('NONE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!session || profile?.role !== 'admin')) {
      router.push('/');
    }
  }, [authLoading, session, profile, router]);

  useEffect(() => {
    if (!session || profile?.role !== 'admin') return;

    (async () => {
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setChamados(data as Chamado[]);
      }
      setLoading(false);
    })();
  }, [session, profile]);

  const filteredChamados = useMemo(() => {
    return chamados.filter((c) => {
      if (filterCategoria !== 'TODAS' && c.categoria !== filterCategoria) return false;
      if (filterAtrasado) {
        const expired = c.sla_limite && new Date(c.sla_limite) < new Date() && c.status !== 'RESOLVIDO' && c.status !== 'REJEITADO';
        if (!expired) return false;
      }
      return true;
    });
  }, [chamados, filterCategoria, filterAtrasado]);

  const stats = useMemo(() => {
    const total = chamados.length;
    const abertos = chamados.filter((c) => c.status === 'ABERTO').length;
    const andamento = chamados.filter((c) => c.status === 'EM_ANDAMENTO').length;
    const resolvidos = chamados.filter((c) => c.status === 'RESOLVIDO').length;
    const atrasados = chamados.filter((c) =>
      c.sla_limite && new Date(c.sla_limite) < new Date() && c.status !== 'RESOLVIDO' && c.status !== 'REJEITADO'
    ).length;
    return { total, abertos, andamento, resolvidos, atrasados };
  }, [chamados]);

  const openDetail = (c: Chamado) => {
    setSelectedChamado(c);
    setNewStatus(c.status);
    setNewSecretaria(c.secretaria || 'NONE');
  };

  const handleSave = async () => {
    if (!selectedChamado) return;
    setSaving(true);

    const updates: any = { status: newStatus };
    if (newSecretaria !== 'NONE') {
      updates.secretaria = newSecretaria;
    }

    const { error } = await supabase
      .from('chamados')
      .update(updates)
      .eq('id', selectedChamado.id);

    if (!error) {
      setChamados((prev) =>
        prev.map((c) => (c.id === selectedChamado.id ? { ...c, ...updates } : c))
      );
      setSelectedChamado(null);
    }
    setSaving(false);
  };

  if (authLoading || (loading && session)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1E5BC6] animate-spin" />
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') return null;

  return (
    <div className="bg-[#F4F6F8] min-h-[calc(100vh-200px)]">
      {/* Admin header bar */}
      <div className="bg-[#0A3A7A] text-white py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold font-heading">Painel de Zelo Urbano</h1>
              <p className="text-blue-200 text-xs">Prefeitura de Trindade - Administração</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-blue-200">Bem-vindo,</p>
            <p className="font-semibold">{profile?.nome || 'Administrador'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: LayoutDashboard, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Abertos', value: stats.abertos, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Em Andamento', value: stats.andamento, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Resolvidos', value: stats.resolvidos, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Atrasados', value: stats.atrasados, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setView('kanban')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === 'kanban' ? 'bg-[#1E5BC6] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('mapa')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === 'mapa' ? 'bg-[#1E5BC6] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Mapa
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v as any)}>
              <SelectTrigger className="w-[160px] h-9 bg-white">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas categorias</SelectItem>
                <SelectItem value="ILUMINACAO">Iluminação</SelectItem>
                <SelectItem value="BURACO">Buraco</SelectItem>
                <SelectItem value="LIMPEZA">Limpeza</SelectItem>
                <SelectItem value="VAZAMENTO">Vazamento</SelectItem>
                <SelectItem value="PODAS">Podas</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => setFilterAtrasado(!filterAtrasado)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              filterAtrasado
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            SLA Atrasado
          </button>

          <span className="text-sm text-gray-500 ml-auto">
            {filteredChamados.length} chamado(s)
          </span>
        </div>

        {/* Kanban view */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map((col) => {
              const colChamados = filteredChamados.filter((c) => c.status === col.status);
              return (
                <div key={col.status} className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${col.color}-500`} />
                      <span className="font-semibold text-sm text-gray-700">{col.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {colChamados.length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-[200px]">
                    {colChamados.map((c) => {
                      const catInfo = getCategoriaInfo(c.categoria);
                      const statusInfo = getStatusInfo(c.status);
                      const slaExpired = c.sla_limite && new Date(c.sla_limite) < new Date() && c.status !== 'RESOLVIDO' && c.status !== 'REJEITADO';

                      return (
                        <Card
                          key={c.id}
                          onClick={() => openDetail(c)}
                          className={`border-gray-200 hover:shadow-md transition-all cursor-pointer ${
                            slaExpired ? 'border-l-4 border-l-red-500' : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            {c.fotos && c.fotos.length > 0 && (
                              <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-gray-100">
                                <img src={c.fotos[0]} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-lg">{catInfo?.emoji}</span>
                              <span className="text-xs font-mono text-gray-500">{c.protocolo}</span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2 mb-2">{c.descricao}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{tempoRelativo(c.created_at)}</span>
                              {slaExpired && (
                                <span className="flex items-center gap-1 text-red-600 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  SLA
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Map view */}
        {view === 'mapa' && (
          <Card className="border-gray-200 overflow-hidden">
            <div style={{ height: '600px' }}>
              <AdminMap chamados={filteredChamados} onSelect={openDetail} />
            </div>
          </Card>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedChamado} onOpenChange={(open) => !open && setSelectedChamado(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedChamado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#0A3A7A] font-heading">
                  <span className="text-2xl">{getCategoriaInfo(selectedChamado.categoria)?.emoji}</span>
                  {selectedChamado.protocolo}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Photos */}
                {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedChamado.fotos.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <Label className="text-xs text-gray-500">Descrição</Label>
                  <p className="text-sm text-gray-800 mt-1">{selectedChamado.descricao}</p>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <MapIcon className="w-5 h-5 text-[#1E5BC6] mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-700">{selectedChamado.endereco_texto || 'Sem endereço'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedChamado.latitude.toFixed(6)}, {selectedChamado.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">Aberto em</Label>
                    <p className="text-gray-800">{formatData(selectedChamado.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">SLA Limite</Label>
                    <p className={`font-medium ${selectedChamado.sla_limite && new Date(selectedChamado.sla_limite) < new Date() ? 'text-red-600' : 'text-gray-800'}`}>
                      {selectedChamado.sla_limite ? formatData(selectedChamado.sla_limite) : '-'}
                    </p>
                  </div>
                </div>

                {/* Admin actions */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Alterar Status</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ChamadoStatus)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABERTO">Aberto</SelectItem>
                        <SelectItem value="TRIADO">Triado</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                        <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                        <SelectItem value="REJEITADO">Rejeitado</SelectItem>
                        <SelectItem value="AVALIADO">Avaliado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Secretaria Responsável</Label>
                    <Select value={newSecretaria} onValueChange={(v) => setNewSecretaria(v as any)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecionar secretaria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Nenhuma</SelectItem>
                        <SelectItem value="OBRAS">Secretaria de Obras</SelectItem>
                        <SelectItem value="LIMPEZA_URBANA">Limpeza Urbana</SelectItem>
                        <SelectItem value="SANEAMENTO">Saneamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-[#1E5BC6] hover:bg-[#0A3A7A] text-white font-semibold h-11"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
