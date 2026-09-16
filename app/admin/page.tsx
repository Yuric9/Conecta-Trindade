'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  supabase,
  STORAGE_BUCKET,
  getStoredProfiles,
  saveStoredProfile,
  deleteStoredProfile,
  getStoredChamadosList,
  saveStoredChamadoItem,
  deleteStoredChamadoItem,
} from '@/lib/supabase/client';
import {
  getStoredOrgaos,
  saveOrgao,
  deleteOrgao,
  resetOrgaosToDefault,
  type OrgaoPublico,
} from '@/lib/public-places';
import {
  getCityConfig,
  saveCityConfig,
  type CityConfig,
} from '@/lib/city-config';
import { useAuth } from '@/lib/auth-context';
import {
  type Chamado,
  type ChamadoStatus,
  type ChamadoCategoria,
  type ChamadoSecretaria,
  type Profile,
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const AdminMap = dynamic(() => import('@/components/admin-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Carregando mapa...</div>
    </div>
  ),
});
import AdminUsersTab from '@/components/admin-users-tab';
import AdminOrgaosTab from '@/components/admin-orgaos-tab';
import AdminConfigTab from '@/components/admin-config-tab';
import AdminModalEditChamado from '@/components/admin-modal-edit-chamado';
import AdminModalNovoChamado from '@/components/admin-modal-novo-chamado';
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
  Search,
  Building2,
  RotateCcw,
  MessageCircle,
  Copy,
  Check,
  FileText,
  Kanban,
  Eye,
  Truck,
  Recycle,
  ArrowRight,
  Settings,
  Plus,
  PlusCircle,
} from 'lucide-react';
import {
  formatChamadoWhatsAppText,
  shareViaWhatsApp,
  copyToClipboard,
} from '@/lib/whatsapp-share';
import { CRONOGRAMA_OFICIAL_TRINDADE, getBairrosHoje, DIAS_SEMANA_LABELS } from '@/lib/rsu-schedule';

const KANBAN_COLUMNS: { status: ChamadoStatus; label: string; color: string }[] = [
  { status: 'ABERTO', label: 'Aberto', color: 'amber' },
  { status: 'TRIADO', label: 'Triado', color: 'purple' },
  { status: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'blue' },
  { status: 'RESOLVIDO', label: 'Resolvido', color: 'green' },
];

export default function AdminPage() {
  const router = useRouter();
  const { session, profile, isAdmin, loading: authLoading } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgaos, setOrgaos] = useState<OrgaoPublico[]>([]);
  const [cityConfig, setCityConfig] = useState<CityConfig>(getCityConfig);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'os' | 'kanban' | 'mapa'>('os');
  const [filterStatus, setFilterStatus] = useState<ChamadoStatus | 'TODOS'>('TODOS');
  const [filterCategoria, setFilterCategoria] = useState<ChamadoCategoria | 'TODAS'>('TODAS');
  const [filterSecretaria, setFilterSecretaria] = useState<ChamadoSecretaria | 'TODAS'>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtrasado, setFilterAtrasado] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewChamadoOpen, setIsNewChamadoOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'chamados' | 'usuarios' | 'orgaos' | 'mapa' | 'rsu' | 'relatorios' | 'configuracoes'
  >('dashboard');

  useEffect(() => {
    if (!authLoading && (!session || !isAdmin)) {
      router.push('/login?unauthorized=admin');
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    if (!session || !isAdmin) return;

    // Carregar todas as coleções do armazenamento persistente
    const loadedChamados = getStoredChamadosList();
    setChamados(loadedChamados);

    const loadedProfiles = getStoredProfiles();
    setProfiles(loadedProfiles);

    const loadedOrgaos = getStoredOrgaos();
    setOrgaos(loadedOrgaos);

    const loadedConfig = getCityConfig();
    setCityConfig(loadedConfig);

    setLoading(false);
  }, [session, profile, isAdmin]);

  const filteredChamados = useMemo(() => {
    return chamados.filter((c) => {
      if (filterStatus !== 'TODOS' && c.status !== filterStatus) return false;
      if (filterCategoria !== 'TODAS' && c.categoria !== filterCategoria) return false;
      if (filterSecretaria !== 'TODAS' && c.secretaria !== filterSecretaria) return false;
      if (filterAtrasado) {
        const expired = c.sla_limite && new Date(c.sla_limite) < new Date() && c.status !== 'RESOLVIDO' && c.status !== 'REJEITADO' && c.status !== 'AVALIADO';
        if (!expired) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProtocolo = c.protocolo?.toLowerCase().includes(term);
        const matchesDesc = c.descricao?.toLowerCase().includes(term);
        const matchesEndereco = c.endereco_texto?.toLowerCase().includes(term);
        if (!matchesProtocolo && !matchesDesc && !matchesEndereco) return false;
      }
      return true;
    });
  }, [chamados, filterStatus, filterCategoria, filterSecretaria, filterAtrasado, searchTerm]);

  const stats = useMemo(() => {
    const total = chamados.length;
    const abertos = chamados.filter((c) => c.status === 'ABERTO').length;
    const triados = chamados.filter((c) => c.status === 'TRIADO').length;
    const andamento = chamados.filter((c) => c.status === 'EM_ANDAMENTO').length;
    const resolvidos = chamados.filter((c) => c.status === 'RESOLVIDO' || c.status === 'AVALIADO').length;
    const atrasados = chamados.filter((c) =>
      c.sla_limite && new Date(c.sla_limite) < new Date() && c.status !== 'RESOLVIDO' && c.status !== 'REJEITADO' && c.status !== 'AVALIADO'
    ).length;
    return { total, abertos, triados, andamento, resolvidos, atrasados };
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
    const header = ['O.S. (Ordem de Serviço)', 'Categoria', 'Status', 'Secretaria', 'Endereço', 'Criado em'];
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
    setIsEditModalOpen(true);
  };

  const handleSaveChamado = (updated: Chamado) => {
    saveStoredChamadoItem(updated);
    setChamados((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteChamado = (id: string) => {
    deleteStoredChamadoItem(id);
    setChamados((prev) => prev.filter((c) => c.id !== id));
    if (selectedChamado?.id === id) {
      setSelectedChamado(null);
      setIsEditModalOpen(false);
    }
  };

  const handleCreateChamado = (novo: Partial<Chamado>) => {
    const id = `ch-adm-${Date.now()}`;
    const protocolo = `TRD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const fullChamado: Chamado = {
      id,
      protocolo,
      cidadao_id: profile?.id || 'admin-user',
      categoria: novo.categoria || 'ILUMINACAO',
      descricao: novo.descricao || '',
      endereco_texto: novo.endereco_texto || 'Trindade - GO',
      latitude: novo.latitude || -16.6496,
      longitude: novo.longitude || -49.4912,
      fotos: novo.fotos || [],
      status: novo.status || 'ABERTO',
      prioridade: novo.prioridade || 'MEDIA',
      secretaria: novo.secretaria || null,
      sla_limite: novo.sla_limite,
      observacoes_internas: novo.observacoes_internas,
      cidadao_nome: novo.cidadao_nome,
      cidadao_telefone: novo.cidadao_telefone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveStoredChamadoItem(fullChamado);
    setChamados((prev) => [fullChamado, ...prev]);
  };

  const handleSaveProfile = (updated: Profile) => {
    saveStoredProfile(updated);
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  };

  const handleDeleteProfile = (id: string) => {
    deleteStoredProfile(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveOrgao = (updated: OrgaoPublico) => {
    saveOrgao(updated);
    setOrgaos((prev) => {
      const idx = prev.findIndex((o) => o.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  };

  const handleDeleteOrgao = (id: string) => {
    deleteOrgao(id);
    setOrgaos((prev) => prev.filter((o) => o.id !== id));
  };

  const handleResetOrgaos = () => {
    const baseline = resetOrgaosToDefault();
    setOrgaos(baseline);
  };

  const handleViewOrgaoOnMap = (_orgao: OrgaoPublico) => {
    setAdminTab('mapa');
    setView('mapa');
  };

  const handleSaveCityConfig = (nextConfig: CityConfig) => {
    saveCityConfig(nextConfig);
    setCityConfig(nextConfig);
  };

  if (authLoading || (loading && session)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#006653] animate-spin" />
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
        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 rounded-xl bg-white border border-gray-200 p-2 shadow-sm">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'chamados' as const, label: 'Ordens de Serviço', icon: ClipboardList, badge: chamados.length },
            { id: 'usuarios' as const, label: 'Usuários & Servidores', icon: UsersRound, badge: profiles.length },
            { id: 'orgaos' as const, label: 'Órgãos no Mapa', icon: Building2, badge: orgaos.length },
            { id: 'mapa' as const, label: 'Mapa Interativo', icon: MapPinned },
            { id: 'rsu' as const, label: 'Coleta RSU', icon: Truck, badge: '117' },
            { id: 'relatorios' as const, label: 'Relatórios', icon: BarChart3 },
            { id: 'configuracoes' as const, label: 'Configurações', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setAdminTab(item.id);
                  if (item.id === 'mapa') setView('mapa');
                  if (item.id === 'chamados' && view === 'mapa') setView('os');
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? 'bg-[#006653] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-emerald-50 hover:text-[#006653]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      active
                        ? 'bg-emerald-800 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total de chamados', value: stats.total, icon: LayoutDashboard, color: 'text-[#006653]', bg: 'bg-emerald-50' },
            { label: 'Abertos', value: stats.abertos, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Em andamento', value: stats.andamento, icon: Timer, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Resolvidos', value: stats.resolvidos, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Atrasados (SLA)', value: stats.atrasados, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold text-gray-800 leading-tight">{stat.value}</p>
                      <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dashboard Operational Widgets */}
        {adminTab === 'dashboard' && (
          <>
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

            {/* Quick Action Shortcuts Grid for Admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Card
                className="border-gray-200 hover:border-[#006653] hover:shadow-md transition-all cursor-pointer bg-white group"
                onClick={() => setIsNewChamadoOpen(true)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#006653] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#006653] transition-colors">
                      Nova Ordem de Serviço
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">Cadastrar chamado manual</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white group"
                onClick={() => setAdminTab('usuarios')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                    <UsersRound className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      Gerenciar Usuários
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">{profiles.length} cadastrados (servidores/cidadãos)</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="border-gray-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer bg-white group"
                onClick={() => setAdminTab('orgaos')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                      Órgãos & Prédios no Mapa
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">{orgaos.length} prédios georreferenciados</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="border-gray-200 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer bg-white group"
                onClick={() => setAdminTab('configuracoes')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                      Configurações da Cidade
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">Ouvidoria, contatos e comunicados</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Tab: Usuários & Servidores */}
        {adminTab === 'usuarios' && (
          <div className="mb-6">
            <AdminUsersTab
              profiles={profiles}
              currentUserId={profile?.id}
              onSaveProfile={handleSaveProfile}
              onDeleteProfile={handleDeleteProfile}
            />
          </div>
        )}

        {/* Tab: Órgãos Públicos & Prédios no Mapa */}
        {adminTab === 'orgaos' && (
          <div className="mb-6">
            <AdminOrgaosTab
              orgaos={orgaos}
              onSaveOrgao={handleSaveOrgao}
              onDeleteOrgao={handleDeleteOrgao}
              onResetOrgaos={handleResetOrgaos}
              onViewOnMap={handleViewOrgaoOnMap}
            />
          </div>
        )}

        {/* Tab: Configurações Municipais */}
        {adminTab === 'configuracoes' && (
          <div className="mb-6">
            <AdminConfigTab
              config={cityConfig}
              onSaveConfig={handleSaveCityConfig}
            />
          </div>
        )}

        {adminTab === 'rsu' && (
          <div className="space-y-6 mb-6">
            {/* RSU Operational Header Card */}
            <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#006653] text-white flex items-center justify-center shadow-sm">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold font-heading text-[#173b32]">
                          Operação de Coleta de Resíduos (RSU) - Trindade
                        </h3>
                        <Badge className="bg-emerald-100 text-[#006653] border-emerald-200 text-xs font-semibold">
                          Sec. Serviços Públicos
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Monitoramento de rotas domiciliares, coleta seletiva e gestão de chamados de lixo/entulho
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href="/cronograma-rsu" target="_blank">
                      <Button variant="outline" size="sm" className="text-xs gap-1.5 border-gray-300">
                        <span>Ver Portal do Cidadão</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFilterCategoria('LIXO');
                        setAdminTab('chamados');
                        setView('os');
                      }}
                      className="bg-[#006653] hover:bg-[#005242] text-white text-xs gap-1.5 shadow-xs"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filtrar O.S. de Lixo</span>
                    </Button>
                  </div>
                </div>

                {/* Métricas RSU */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                  <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-100">
                    <span className="text-xs text-gray-500">Setores na Planilha</span>
                    <p className="text-xl font-bold text-gray-900 mt-1">{CRONOGRAMA_OFICIAL_TRINDADE.length} bairros</p>
                    <span className="text-[11px] text-gray-400">100% de Trindade</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-100">
                    <span className="text-xs text-emerald-800 font-medium">Coleta ativa hoje</span>
                    <p className="text-xl font-bold text-[#006653] mt-1">{getBairrosHoje().totalHoje} bairros</p>
                    <span className="text-[11px] text-emerald-700">
                      {getBairrosHoje().matutino.length} Matutino · {getBairrosHoje().vespertino.length} Vespertino
                    </span>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3.5 border border-blue-100">
                    <span className="text-xs text-blue-800 font-medium">Divisão Territorial</span>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {CRONOGRAMA_OFICIAL_TRINDADE.filter((r) => r.regiao === 'CENTRO').length} Centro · {CRONOGRAMA_OFICIAL_TRINDADE.filter((r) => r.regiao === 'LESTE').length} Leste
                    </p>
                    <span className="text-[11px] text-blue-700">Setores cadastrados</span>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-100">
                    <span className="text-xs text-amber-800 font-medium">O.S. de Lixo Pendentes</span>
                    <p className="text-xl font-bold text-amber-900 mt-1">
                      {chamados.filter((c) => c.categoria === 'LIXO' && c.status !== 'RESOLVIDO' && c.status !== 'REJEITADO').length}
                    </p>
                    <span className="text-[11px] text-amber-700">Aguardando/em rota</span>
                  </div>
                </div>

                {/* Tabela de Bairros Oficiais */}
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Grade Oficial de Bairros e Frequência de Coleta (117 Setores)
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Bairro / Setor</th>
                          <th className="py-2.5 px-3">Frequência</th>
                          <th className="py-2.5 px-3">Turno</th>
                          <th className="py-2.5 px-3">Região</th>
                          <th className="py-2.5 px-3">Dias da Semana</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {CRONOGRAMA_OFICIAL_TRINDADE.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2 px-3 font-mono text-gray-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-gray-900">{item.bairro}</td>
                            <td className="py-2 px-3 text-gray-700 font-medium">{item.frequenciaTexto}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.turno === 'MATUTINO'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-blue-100 text-blue-900'
                                }`}
                              >
                                {item.turno}
                              </span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px]">
                                {item.regiao}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                              {item.diasSemana.map((d) => DIAS_SEMANA_LABELS[d].curto).join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba de Gerenciamento Completo de Ordens de Serviço (Chamados) */}
        {adminTab === 'chamados' && (
          <>
            {/* Toolbar com Ações, Filtros e Botão de Nova O.S. */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('os')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    view === 'os' ? 'bg-[#006653] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Visualização em Lista de Ordens de Serviço"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Ordens de Serviço</span>
                </button>
                <button
                  onClick={() => setView('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    view === 'kanban' ? 'bg-[#006653] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Visualização em Quadro por Etapas"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Quadro</span>
                </button>
                <button
                  onClick={() => setView('mapa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    view === 'mapa' ? 'bg-[#006653] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Visualização no Mapa Territorial"
                >
                  <MapPinned className="w-3.5 h-3.5" />
                  <span>Mapa</span>
                </button>
              </div>

              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar por O.S., rua, descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-9 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v as any)}>
                  <SelectTrigger className="w-[150px] h-9 bg-gray-50 border-gray-200 text-xs">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas categorias</SelectItem>
                    <SelectItem value="ILUMINACAO">Iluminação</SelectItem>
                    <SelectItem value="BURACO">Buracos</SelectItem>
                    <SelectItem value="LIXO">Lixo e Entulho</SelectItem>
                    <SelectItem value="VAZAMENTO">Vazamentos</SelectItem>
                    <SelectItem value="PODA">Podas</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <Select value={filterSecretaria} onValueChange={(v) => setFilterSecretaria(v as any)}>
                  <SelectTrigger className="w-[170px] h-9 bg-gray-50 border-gray-200 text-xs">
                    <SelectValue placeholder="Secretaria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas secretarias</SelectItem>
                    <SelectItem value="OBRAS">Sec. de Obras</SelectItem>
                    <SelectItem value="SERVICOS_PUBLICOS">Serviços Públicos</SelectItem>
                    <SelectItem value="MEIO_AMBIENTE">Meio Ambiente</SelectItem>
                    <SelectItem value="TRANSITO">Trânsito</SelectItem>
                    <SelectItem value="SAUDE">Saúde</SelectItem>
                    <SelectItem value="EDUCACAO">Educação</SelectItem>
                    <SelectItem value="SEGURANCA">Segurança / Defesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={() => setFilterAtrasado(!filterAtrasado)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterAtrasado
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                SLA Atrasado
              </button>

              {(filterCategoria !== 'TODAS' || filterSecretaria !== 'TODAS' || filterAtrasado || searchTerm || filterStatus !== 'TODOS') && (
                <button
                  onClick={() => {
                    setFilterStatus('TODOS');
                    setFilterCategoria('TODAS');
                    setFilterSecretaria('TODAS');
                    setFilterAtrasado(false);
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  title="Limpar todos os filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap bg-gray-50 px-2.5 py-1.5 rounded-full border border-gray-200 hidden sm:inline">
                  {filteredChamados.length} de {chamados.length} O.S.
                </span>

                <Button
                  onClick={() => setIsNewChamadoOpen(true)}
                  className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 px-3.5 gap-1.5 shadow-sm font-semibold whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nova Ordem de Serviço</span>
                </Button>
              </div>
            </div>

        {/* Visualização Estruturada em Tabela de Ordens de Serviço (O.S.) */}
        {view === 'os' && (
          <Card className="border-gray-200 shadow-sm overflow-hidden bg-white mb-6">
            {/* Filtros rápidos por status de O.S. */}
            <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#006653]" />
                  Status da O.S.:
                </span>
                {[
                  { id: 'TODOS' as const, label: 'Todas as O.S.', count: stats.total },
                  { id: 'ABERTO' as const, label: 'Abertas', count: stats.abertos },
                  { id: 'TRIADO' as const, label: 'Triadas', count: stats.triados },
                  { id: 'EM_ANDAMENTO' as const, label: 'Em Andamento', count: stats.andamento },
                  { id: 'RESOLVIDO' as const, label: 'Concluídas', count: stats.resolvidos },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setFilterStatus(st.id)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all flex items-center gap-1.5 ${
                      filterStatus === st.id
                        ? 'bg-[#006653] text-white border-[#006653] shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        filterStatus === st.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              <Button
                onClick={exportCsv}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-[#006653] text-[#006653] hover:bg-emerald-50 h-8 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Relatório O.S. (CSV)</span>
              </Button>
            </div>

            {filteredChamados.length === 0 ? (
              <div className="py-14 text-center px-4">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">Nenhuma Ordem de Serviço encontrada</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Ajuste os filtros de busca, categoria ou status acima para localizar outras solicitações.
                </p>
                {(filterCategoria !== 'TODAS' || filterSecretaria !== 'TODAS' || filterAtrasado || searchTerm || filterStatus !== 'TODOS') && (
                  <Button
                    onClick={() => {
                      setFilterStatus('TODOS');
                      setFilterCategoria('TODAS');
                      setFilterSecretaria('TODAS');
                      setFilterAtrasado(false);
                      setSearchTerm('');
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                  >
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nº da O.S. & Registro</th>
                      <th className="py-3 px-4">Serviço / Demanda</th>
                      <th className="py-3 px-4 min-w-[240px]">Descrição da Ocorrência</th>
                      <th className="py-3 px-4">Localização</th>
                      <th className="py-3 px-4">Secretaria Responsável</th>
                      <th className="py-3 px-4">SLA / Prazo</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredChamados.map((c) => {
                      const catInfo = getCategoriaInfo(c.categoria);
                      const statusInfo = getStatusInfo(c.status);
                      const slaExpired =
                        c.sla_limite &&
                        new Date(c.sla_limite) < new Date() &&
                        c.status !== 'RESOLVIDO' &&
                        c.status !== 'REJEITADO' &&
                        c.status !== 'AVALIADO';
                      const hasFoto = c.fotos && c.fotos.length > 0;

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                          onClick={() => openDetail(c)}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-[#006653] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                                {c.protocolo}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{formatData(c.created_at)}</span>
                              <span className="text-gray-300">·</span>
                              <span>{tempoRelativo(c.created_at)}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 font-medium text-gray-800 text-[11.5px]">
                              <span>{catInfo?.emoji || '📋'}</span>
                              <span>{catInfo?.label || c.categoria}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5 max-w-sm">
                              {hasFoto && (
                                <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0 relative">
                                  <img
                                    src={c.fotos[0]}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-gray-800 line-clamp-2 leading-relaxed font-normal">
                                  {c.descricao}
                                </p>
                                {hasFoto && (
                                  <span className="text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1 mt-0.5">
                                    <ImageIcon className="w-2.5 h-2.5" />
                                    {c.fotos.length} foto(s) anexada(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[190px]">
                            <div className="flex items-start gap-1 text-gray-700">
                              <MapPinned className="w-3.5 h-3.5 text-[#006653] flex-shrink-0 mt-0.5" />
                              <span className="truncate text-xs" title={c.endereco_texto || 'Trindade - GO'}>
                                {c.endereco_texto || 'Trindade - GO'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.secretaria ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-[#006653] border border-emerald-200">
                                <Building2 className="w-3 h-3" />
                                {SECRETARIAS[c.secretaria] || c.secretaria}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Aguardando Despacho
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {slaExpired ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10.5px] gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Vencido
                              </Badge>
                            ) : c.status === 'RESOLVIDO' || c.status === 'AVALIADO' ? (
                              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Concluído
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-600 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {c.sla_limite ? tempoRelativo(c.sla_limite) : 'No prazo'}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0 text-[11px] font-medium`}>
                              {statusInfo.label}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(c);
                              }}
                              className="bg-[#006653] hover:bg-[#005242] text-white text-xs h-7 px-2.5 gap-1 shadow-xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Gerenciar O.S.</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Quadro Kanban (Alternativa visual organizada por etapas) */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {KANBAN_COLUMNS.map((col) => {
              const colChamados = filteredChamados.filter((c) => c.status === col.status);
              return (
                <div key={col.status} className="space-y-3">
                  <div className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full bg-${col.color}-500`} />
                      <span className="font-semibold text-xs text-gray-800">{col.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {colChamados.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 min-h-[200px]">
                    {colChamados.map((c) => {
                      const catInfo = getCategoriaInfo(c.categoria);
                      const slaExpired =
                        c.sla_limite &&
                        new Date(c.sla_limite) < new Date() &&
                        c.status !== 'RESOLVIDO' &&
                        c.status !== 'REJEITADO' &&
                        c.status !== 'AVALIADO';

                      return (
                        <Card
                          key={c.id}
                          onClick={() => openDetail(c)}
                          className={`border-gray-200 hover:shadow-md transition-all cursor-pointer bg-white ${
                            slaExpired ? 'border-l-4 border-l-red-500' : ''
                          }`}
                        >
                          <CardContent className="p-3.5">
                            {c.fotos && c.fotos.length > 0 && (
                              <div className="w-full h-24 rounded-lg overflow-hidden mb-2.5 bg-gray-100 border border-gray-100">
                                <img
                                  src={c.fotos[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="font-mono text-xs font-bold text-[#006653] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {c.protocolo}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <span>{catInfo?.emoji}</span>
                                <span>{catInfo?.label}</span>
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2 mb-2.5 leading-relaxed">{c.descricao}</p>
                            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-100">
                              <span className="text-gray-400">{tempoRelativo(c.created_at)}</span>
                              {slaExpired ? (
                                <span className="flex items-center gap-1 text-red-600 font-semibold">
                                  <AlertTriangle className="w-3 h-3" />
                                  SLA Vencido
                                </span>
                              ) : (
                                <span className="text-[#006653] font-medium flex items-center gap-0.5">
                                  <Eye className="w-3 h-3" />
                                  Ver O.S.
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

            {/* Map view dentro de chamados */}
            {view === 'mapa' && (
              <Card className="border-gray-200 overflow-hidden shadow-sm mb-6 bg-white">
                <div className="bg-emerald-950 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-emerald-100">Mapa Territorial Oficial de Trindade - GO</span>
                    <span className="text-emerald-300/70 hidden md:inline">| Prédios Públicos e Chamados Georreferenciados</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-200 text-[11px]">
                    <span className="bg-emerald-800/80 px-2.5 py-0.5 rounded text-emerald-100 font-medium">
                      {orgaos.length} Prédios Públicos
                    </span>
                    <span className="bg-amber-600/90 px-2.5 py-0.5 rounded text-white font-mono font-bold">
                      {filteredChamados.length} chamado(s)
                    </span>
                  </div>
                </div>
                <div style={{ height: '620px' }}>
                  <AdminMap
                    chamados={filteredChamados}
                    orgaos={orgaos}
                    onSelect={openDetail}
                    onEditOrgao={handleSaveOrgao}
                    onDeleteOrgao={handleDeleteOrgao}
                  />
                </div>
              </Card>
            )}
          </>
        )}

        {/* Aba de Mapa Territorial Completo e Dedicado */}
        {adminTab === 'mapa' && (
          <Card className="border-gray-200 overflow-hidden shadow-sm mb-6 bg-white">
            <div className="bg-gradient-to-r from-emerald-950 via-[#004d3e] to-[#006653] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-emerald-50 text-sm font-heading">
                    Mapa Territorial e Patrimonial de Trindade - GO
                  </h3>
                  <p className="text-emerald-200/80 text-[11px]">
                    Visualização georreferenciada de prédios públicos, UBS, CMEIs, escolas e ordens de serviço ativas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdminTab('orgaos')}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Gerenciar Órgãos no Mapa</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsNewChamadoOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs h-8 gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nova O.S. no Mapa</span>
                </Button>
              </div>
            </div>
            <div style={{ height: '650px' }}>
              <AdminMap
                chamados={filteredChamados}
                orgaos={orgaos}
                onSelect={openDetail}
                onEditOrgao={handleSaveOrgao}
                onDeleteOrgao={handleDeleteOrgao}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Modal de Edição Completa de Ordem de Serviço */}
      <AdminModalEditChamado
        chamado={selectedChamado}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedChamado(null);
        }}
        onSave={handleSaveChamado}
        onDelete={handleDeleteChamado}
      />

      {/* Modal de Criação de Nova Ordem de Serviço Manual (Administrador) */}
      <AdminModalNovoChamado
        open={isNewChamadoOpen}
        onClose={() => setIsNewChamadoOpen(false)}
        onCreate={handleCreateChamado}
      />
    </div>
  );
}
