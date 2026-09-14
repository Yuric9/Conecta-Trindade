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
  BarChart3,
  Users,
  Timer,
  ArrowUpRight,
  ClipboardList,
  Download,
  UsersRound,
  MapPinned,
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
  const [adminTab, setAdminTab] = useState<'dashboard' | 'chamados' | 'mapa' | 'relatorios' | 'cidadaos'>('dashboard');

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

  const categoryStats = useMemo(() => {
    return [
      { id: 'ILUMINACAO' as ChamadoCategoria, label: 'Iluminação', color: 'bg-amber-400' },
      { id: 'BURACO' as ChamadoCategoria, label: 'Buracos', color: 'bg-orange-400' },
      { id: 'LIMPEZA' as ChamadoCategoria, label: 'Limpeza', color: 'bg-emerald-500' },
      { id: 'VAZAMENTO' as ChamadoCategoria, label: 'Vazamentos', color: 'bg-sky-500' },
      { id: 'PODAS' as ChamadoCategoria, label: 'Podas', color: 'bg-green-600' },
      { id: 'OUTROS' as ChamadoCategoria, label: 'Outros', color: 'bg-slate-400' },
    ].map((category) => ({
      ...category,
      total: chamados.filter((c) => c.categoria === category.id).length,
    }));
  }, [chamados]);

  const recentChamados = useMemo(() => chamados.slice(0, 5), [chamados]);

  const secretariaStats = useMemo(() => {
    return (Object.entries(SECRETARIAS) as [ChamadoSecretaria, string][]).map(([id, label]) => {
      const items = chamados.filter((c) => c.secretaria === id);
      return {
        id,
        label,
        total: items.length,
        resolvidos: items.filter((c) => c.status === 'RESOLVIDO' || c.status === 'AVALIADO').length,
        pendentes: items.filter((c) => c.status !== 'RESOLVIDO' && c.status !== 'AVALIADO' && c.status !== 'REJEITADO').length,
      };
    });
  }, [chamados]);

  const citizenStats = useMemo(() => {
    const map = new Map<string, { total: number; ultimo: string }>();
    chamados.forEach((c) => {
      const current = map.get(c.cidadao_id);
      map.set(c.cidadao_id, {
        total: (current?.total || 0) + 1,
        ultimo: !current || new Date(c.created_at) > new Date(current.ultimo) ? c.created_at : current.ultimo,
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [chamados]);

  const exportCsv = () => {
    const header = ['Protocolo', 'Categoria', 'Status', 'Secretaria', 'Endereço', 'Criado em'];
    const rows = chamados.map((c) => [
      c.protocolo,
      getCategoriaInfo(c.categoria)?.label || c.categoria,
      getStatusInfo(c.status).label,
      c.secretaria ? SECRETARIAS[c.secretaria] : 'Não atribuída',
      c.endereco_texto || '',
      formatData(c.created_at),
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-conecta-trindade-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
    <div className="bg-[#eef1ef] min-h-[calc(100vh-200px)]">
      {/* Admin header bar */}
      <div className="bg-gradient-to-r from-[#006653] to-[#004d3e] text-white py-5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold font-heading">Painel de Zelo Urbano</h1>
              <p className="text-emerald-100 text-xs">Prefeitura de Trindade - Gestão de chamados</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-emerald-100">Bem-vindo,</p>
            <p className="font-semibold">{profile?.nome || 'Administrador'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6 rounded-xl bg-white border border-gray-200 p-2 shadow-sm">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'chamados' as const, label: 'Chamados', icon: ClipboardList },
            { id: 'mapa' as const, label: 'Mapa da cidade', icon: MapPinned },
            { id: 'relatorios' as const, label: 'Relatórios', icon: BarChart3 },
            { id: 'cidadaos' as const, label: 'Cidadãos', icon: UsersRound },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setAdminTab(item.id);
                  if (item.id === 'mapa') setView('mapa');
                  if (item.id === 'chamados') setView('kanban');
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  adminTab === item.id ? 'bg-[#006653] text-white' : 'text-gray-600 hover:bg-emerald-50 hover:text-[#006653]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b18400]">Visão geral</p>
            <h2 className="text-2xl font-bold font-heading text-[#173b32]">Dashboard operacional</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-500 border border-gray-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Dados atualizados em tempo real
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total de chamados', value: stats.total, icon: LayoutDashboard, color: 'text-[#006653]', bg: 'bg-emerald-50' },
            { label: 'Abertos', value: stats.abertos, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Em andamento', value: stats.andamento, icon: Timer, color: 'text-sky-600', bg: 'bg-sky-50' },
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

                    <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 mb-6">
                      <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <h3 className="font-bold text-[#173b32]">Chamados por categoria</h3>
                              <p className="text-xs text-gray-500 mt-1">Distribuição das solicitações recebidas</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-[#d59f00]" />
                          </div>
                          <div className="space-y-3">
                            {categoryStats.map((category) => {
                              const percentage = stats.total ? Math.round((category.total / stats.total) * 100) : 0;
                              return (
                                <div key={category.id} className="grid grid-cols-[100px_1fr_34px] items-center gap-3 text-xs">
                                  <span className="text-gray-600">{category.label}</span>
                                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${category.color}`} style={{ width: `${percentage}%` }} />
                                  </div>
                                  <span className="text-right font-bold text-gray-700">{category.total}</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-[#173b32]">Resumo do atendimento</h3>
                              <p className="text-xs text-gray-500 mt-1">Acompanhe a evolução da operação</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-[#d59f00]" />
                          </div>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-gray-600">Taxa de resolução</span>
                                <strong className="text-[#006653]">{stats.total ? Math.round((stats.resolvidos / stats.total) * 100) : 0}%</strong>
                              </div>
                              <Progress value={stats.total ? (stats.resolvidos / stats.total) * 100 : 0} className="[&>div]:bg-[#006653]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg bg-emerald-50 p-3">
                                <Users className="w-4 h-4 text-[#006653] mb-2" />
                                <p className="text-xl font-bold text-[#173b32]">{new Set(chamados.map((c) => c.cidadao_id)).size}</p>
                                <p className="text-[11px] text-gray-500">cidadãos atendidos</p>
                              </div>
                              <div className="rounded-lg bg-amber-50 p-3">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mb-2" />
                                <p className="text-xl font-bold text-[#173b32]">{stats.atrasados}</p>
                                <p className="text-[11px] text-gray-500">fora do SLA</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-gray-200 shadow-sm mb-6">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-[#173b32]">Últimos chamados recebidos</h3>
                            <p className="text-xs text-gray-500 mt-1">Acesse rapidamente as solicitações mais recentes</p>
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-[#006653]" />
                        </div>
                        {recentChamados.length === 0 ? (
                          <p className="text-sm text-gray-500 py-3">Nenhum chamado recebido até o momento.</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {recentChamados.map((chamado) => {
                              const statusInfo = getStatusInfo(chamado.status);
                              const categoryInfo = getCategoriaInfo(chamado.categoria);
                              return (
                                <button key={chamado.id} onClick={() => openDetail(chamado)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 transition-colors rounded-md px-2">
                                  <span className="text-xl">{categoryInfo?.emoji}</span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-gray-800 truncate">{chamado.protocolo}</span>
                                    <span className="block text-xs text-gray-500 truncate">{categoryInfo?.label} · {tempoRelativo(chamado.created_at)}</span>
                                  </span>
                                  <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0 text-[11px]`}>{statusInfo.label}</Badge>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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

        {adminTab === 'relatorios' && (
          <Card className="border-gray-200 shadow-sm mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-[#173b32]">Relatórios por secretaria</h3>
                  <p className="text-xs text-gray-500 mt-1">Carga e resolução por área responsável</p>
                </div>
                <Button onClick={exportCsv} variant="outline" className="gap-2 border-[#006653] text-[#006653]">
                  <Download className="w-4 h-4" /> Exportar CSV
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {secretariaStats.map((secretaria) => (
                  <div key={secretaria.id} className="rounded-xl border border-gray-200 p-4">
                    <p className="font-semibold text-gray-800">{secretaria.label}</p>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div><p className="text-xl font-bold text-[#006653]">{secretaria.total}</p><p className="text-[10px] text-gray-500">total</p></div>
                      <div><p className="text-xl font-bold text-emerald-600">{secretaria.resolvidos}</p><p className="text-[10px] text-gray-500">resolvidos</p></div>
                      <div><p className="text-xl font-bold text-amber-600">{secretaria.pendentes}</p><p className="text-[10px] text-gray-500">pendentes</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {adminTab === 'cidadaos' && (
          <Card className="border-gray-200 shadow-sm mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <UsersRound className="w-5 h-5 text-[#006653]" />
                <div>
                  <h3 className="font-bold text-[#173b32]">Cidadãos atendidos</h3>
                  <p className="text-xs text-gray-500 mt-1">Quantidade de solicitações por cidadão</p>
                </div>
              </div>
              {citizenStats.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum cidadão com chamado registrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500"><th className="pb-3">Identificador</th><th className="pb-3">Chamados</th><th className="pb-3">Último registro</th></tr></thead>
                    <tbody>{citizenStats.map(([id, info]) => <tr key={id} className="border-b last:border-0"><td className="py-3 font-mono text-xs text-gray-700">{id}</td><td className="py-3 font-bold text-[#006653]">{info.total}</td><td className="py-3 text-gray-500">{formatData(info.ultimo)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
