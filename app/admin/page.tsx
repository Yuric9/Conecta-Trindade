'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  supabase,
  isSupabaseConfigured,
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
  CATEGORIAS,
  normalizeCategoria,
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
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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
  Phone,
  RefreshCw,
  MapPin,
  User,
  Shield,
  LogIn,
} from 'lucide-react';
import {
  formatChamadoWhatsAppText,
  shareViaWhatsApp,
  copyToClipboard,
} from '@/lib/whatsapp-share';
import { CRONOGRAMA_OFICIAL_TRINDADE, getBairrosHoje, DIAS_SEMANA_LABELS } from '@/lib/rsu-schedule';

type NormalizedStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

function normalizeStatus(status: string | undefined): NormalizedStatus {
  if (!status) return 'Pendente';
  const s = status.toUpperCase().trim();
  if (s === 'ABERTO' || s === 'TRIADO' || s === 'PENDENTE') return 'Pendente';
  if (s === 'EM_ANDAMENTO' || s === 'EM ANDAMENTO') return 'Em Andamento';
  if (s === 'RESOLVIDO' || s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'AVALIADO') return 'Concluído';
  if (s === 'CANCELADO' || s === 'REJEITADO') return 'Cancelado';
  return 'Pendente';
}

function StatusBadge({ status }: { status: string }) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'Pendente':
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100 font-semibold px-2.5 py-0.5 text-xs gap-1.5 shadow-2xs"
        >
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          Pendente
        </Badge>
      );
    case 'Em Andamento':
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 font-semibold px-2.5 py-0.5 text-xs gap-1.5 shadow-2xs"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Em Andamento
        </Badge>
      );
    case 'Concluído':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 font-semibold px-2.5 py-0.5 text-xs gap-1.5 shadow-2xs"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          Concluído
        </Badge>
      );
    case 'Cancelado':
    default:
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100 font-medium px-2.5 py-0.5 text-xs gap-1.5 shadow-2xs"
        >
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          {status || 'Pendente'}
        </Badge>
      );
  }
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedProtocol, setCopiedProtocol] = useState<string | null>(null);
  const [view, setView] = useState<'os' | 'kanban' | 'mapa'>('os');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterCategoria, setFilterCategoria] = useState<ChamadoCategoria | 'TODAS'>('TODAS');
  const [filterSecretaria, setFilterSecretaria] = useState<ChamadoSecretaria | 'TODAS'>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtrasado, setFilterAtrasado] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewChamadoOpen, setIsNewChamadoOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'chamados' | 'usuarios' | 'orgaos' | 'mapa' | 'rsu' | 'relatorios' | 'configuracoes'
  >('chamados');

  const isFiscalOrAdmin = Boolean(
    isAdmin ||
    profile?.role === 'admin' ||
    profile?.role === 'fiscal' ||
    profile?.role === 'gestor' ||
    profile?.role === 'atendente' ||
    session?.user?.email?.toLowerCase().includes('admin') ||
    session?.user?.email?.toLowerCase().includes('fiscal')
  );

  const fetchChamadosFromDatabase = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Tentar buscar da API /api/chamados
      let apiChamados: any[] = [];
      try {
        const res = await fetch('/api/chamados?limit=100', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.chamados)) {
            apiChamados = data.chamados;
          }
        }
      } catch (apiErr) {
        console.warn('API /api/chamados inacessível, usando armazenamento local:', apiErr);
      }

      // 2. Buscar dados locais persistentes
      const localChamados = getStoredChamadosList();

      // 3. Mesclar registros garantindo exibição de novos chamados
      const map = new Map<string, Chamado>();

      localChamados.forEach((c) => {
        const key = c.protocolo || c.id;
        map.set(key, c);
      });

      apiChamados.forEach((c) => {
        const key = c.protocolo || c.id;
        const existing = map.get(key);
        map.set(key, {
          id: c.id || existing?.id || key,
          protocolo: c.protocolo || existing?.protocolo || key,
          cidadao_id: existing?.cidadao_id || 'cidadao-app',
          cidadao_nome: c.nome_cidadao || c.cidadao_nome || existing?.cidadao_nome || 'Cidadão Trindadense',
          cidadao_telefone: c.telefone_cidadao || c.cidadao_telefone || existing?.cidadao_telefone,
          categoria: normalizeCategoria(c.categoria_servico || c.categoria || existing?.categoria),
          descricao: c.descricao || existing?.descricao || '',
          endereco_texto: c.endereco || c.endereco_texto || existing?.endereco_texto || 'Trindade - GO',
          latitude: c.latitude || existing?.latitude || -16.6496,
          longitude: c.longitude || existing?.longitude || -49.4912,
          fotos: c.foto_url ? [c.foto_url] : (c.fotos || existing?.fotos || []),
          status: (c.status || existing?.status || 'ABERTO') as ChamadoStatus,
          prioridade: existing?.prioridade || 'MEDIA',
          secretaria: existing?.secretaria || null,
          observacoes_internas: c.observacoes_internas || existing?.observacoes_internas,
          created_at: c.created_at || existing?.created_at || new Date().toISOString(),
          updated_at: c.updated_at || existing?.updated_at || new Date().toISOString(),
        });
      });

      const mergedList = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setChamados(mergedList);
    } catch (err) {
      console.error('Erro ao buscar chamados do banco de dados:', err);
      setChamados(getStoredChamadosList());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChamadosFromDatabase();

    const loadedProfiles = getStoredProfiles();
    setProfiles(loadedProfiles);

    const loadedOrgaos = getStoredOrgaos();
    setOrgaos(loadedOrgaos);

    const loadedConfig = getCityConfig();
    setCityConfig(loadedConfig);
  }, [fetchChamadosFromDatabase]);

  const handleQuickStatusChange = async (chamado: Chamado, newStatus: NormalizedStatus) => {
    const chamadoId = chamado.id || chamado.protocolo;
    setUpdatingId(chamadoId);
    const oldStatus = chamado.status;

    // Atualização otimista imediata na interface
    const updated: Chamado = {
      ...chamado,
      status: newStatus as ChamadoStatus,
      updated_at: new Date().toISOString(),
    };

    setChamados((prev) =>
      prev.map((c) =>
        c.id === chamado.id || c.protocolo === chamado.protocolo ? updated : c
      )
    );

    // Salvar localmente no storage persistente
    saveStoredChamadoItem(updated);

    try {
      // 1. Chamar PATCH na API /api/chamados
      const res = await fetch('/api/chamados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chamado.id,
          protocolo: chamado.protocolo,
          status: newStatus,
        }),
      });

      // 2. Se Supabase estiver conectado, atualizar na tabela também
      if (isSupabaseConfigured) {
        let q = (supabase.from('chamados') as any).update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        });
        if (chamado.id) {
          q = q.eq('id', idMatch(chamado.id));
        } else if (chamado.protocolo) {
          q = q.eq('protocolo', chamado.protocolo);
        }
        await q;
      }

      setFeedbackMessage({
        type: 'success',
        text: `O.S. ${chamado.protocolo} atualizada para "${newStatus}" em tempo real no banco de dados!`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Erro ao atualizar status do chamado:', err);
      // Reverter se falhar
      setChamados((prev) =>
        prev.map((c) => (c.id === chamado.id ? { ...c, status: oldStatus } : c))
      );
      setFeedbackMessage({
        type: 'error',
        text: 'Não foi possível salvar a alteração de status no banco de dados.',
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setUpdatingId(null);
    }
  };

  function idMatch(val: string) {
    return val;
  }

  const filteredChamados = useMemo(() => {
    return chamados.filter((c) => {
      if (filterStatus !== 'TODOS') {
        const norm = normalizeStatus(c.status);
        if (norm !== filterStatus) return false;
      }
      if (filterCategoria !== 'TODAS' && normalizeCategoria(c.categoria) !== filterCategoria) return false;
      if (filterSecretaria !== 'TODAS' && c.secretaria !== filterSecretaria) return false;
      if (filterAtrasado) {
        const expired =
          c.sla_limite &&
          new Date(c.sla_limite) < new Date() &&
          normalizeStatus(c.status) !== 'Concluído' &&
          normalizeStatus(c.status) !== 'Cancelado';
        if (!expired) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProtocolo = c.protocolo?.toLowerCase().includes(term);
        const matchesDesc = c.descricao?.toLowerCase().includes(term);
        const matchesEndereco = c.endereco_texto?.toLowerCase().includes(term);
        const matchesCidadao = (c.cidadao_nome || (c as any).nome_cidadao)?.toLowerCase()?.includes(term);
        if (!matchesProtocolo && !matchesDesc && !matchesEndereco && !matchesCidadao) return false;
      }
      return true;
    });
  }, [chamados, filterStatus, filterCategoria, filterSecretaria, filterAtrasado, searchTerm]);

  const stats = useMemo(() => {
    const total = chamados.length;
    const pendentes = chamados.filter((c) => normalizeStatus(c.status) === 'Pendente').length;
    const andamento = chamados.filter((c) => normalizeStatus(c.status) === 'Em Andamento').length;
    const concluidos = chamados.filter((c) => normalizeStatus(c.status) === 'Concluído').length;
    const cancelados = chamados.filter((c) => normalizeStatus(c.status) === 'Cancelado').length;
    const atrasados = chamados.filter((c) =>
      c.sla_limite &&
      new Date(c.sla_limite) < new Date() &&
      normalizeStatus(c.status) !== 'Concluído' &&
      normalizeStatus(c.status) !== 'Cancelado'
    ).length;
    return {
      total,
      pendentes,
      abertos: pendentes,
      andamento,
      resolvidos: concluidos,
      concluidos,
      cancelados,
      triados: 0,
      atrasados,
    };
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

  const handleSaveChamado = async (updated: Chamado) => {
    // 1. Salvar no estado local e no storage persistente
    saveStoredChamadoItem(updated);
    setChamados((prev) => prev.map((c) => (c.id === updated.id || c.protocolo === updated.protocolo ? updated : c)));

    // 2. Chamar PATCH /api/chamados para sincronizar em tempo real no banco
    try {
      await fetch('/api/chamados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updated.id,
          protocolo: updated.protocolo,
          status: updated.status,
          observacao: updated.observacoes_internas,
        }),
      });

      if (isSupabaseConfigured) {
        let q = (supabase.from('chamados') as any).update({
          status: updated.status,
          secretaria: updated.secretaria,
          prioridade: updated.prioridade,
          observacoes_internas: updated.observacoes_internas,
          updated_at: new Date().toISOString(),
        });
        if (updated.id) {
          q = q.eq('id', updated.id);
        } else if (updated.protocolo) {
          q = q.eq('protocolo', updated.protocolo);
        }
        await q;
      }

      setFeedbackMessage({
        type: 'success',
        text: `Ordem de Serviço ${updated.protocolo} salva no banco de dados com sucesso!`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Erro ao sincronizar O.S. com o banco:', err);
    }
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
    const protocolo = `TRIN-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const fullChamado: Chamado = {
      id,
      protocolo,
      cidadao_id: profile?.id || 'fiscal-user',
      categoria: novo.categoria || 'ILUMINACAO',
      descricao: novo.descricao || '',
      endereco_texto: novo.endereco_texto || 'Trindade - GO',
      latitude: novo.latitude || -16.6496,
      longitude: novo.longitude || -49.4912,
      fotos: novo.fotos || [],
      status: novo.status || 'Pendente',
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

  if (authLoading && chamados.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3">
        <Loader2 className="w-8 h-8 text-[#006653] animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Carregando painel de fiscalização...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#eef1ef] min-h-[calc(100vh-200px)]">
      {/* Demo notice if accessing without fiscal/admin role */}
      {!isFiscalOrAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-400/30 text-amber-900 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Ambiente de Fiscalização Conecta-Trindade (Modo Demonstração):</strong> Você pode gerenciar ordens de serviço, alterar status em tempo real e visualizar chamados salvos.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/login')}
            className="h-7 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            <LogIn className="w-3 h-3 mr-1" />
            Entrar como Fiscal
          </Button>
        </div>
      )}

      {/* Admin header bar */}
      <div className="bg-gradient-to-r from-[#006653] to-[#004d3e] text-white py-5 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold font-heading">Painel de Fiscalização Urbana</h1>
              <p className="text-emerald-100 text-xs">Prefeitura de Trindade - Gestão de Ordens de Serviço</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-emerald-100">Operador,</p>
            <p className="font-semibold">{profile?.nome || (isFiscalOrAdmin ? 'Fiscal Trindade' : 'Fiscal (Demonstração)')}</p>
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
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-1.5">
                          <span>{cat.emoji}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
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
          <div>
            {/* Feedback message banner */}
            {feedbackMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-red-50 text-red-900 border border-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedbackMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span>{feedbackMessage.text}</span>
                </div>
                <button
                  onClick={() => setFeedbackMessage(null)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <Card className="border-gray-200 shadow-sm overflow-hidden bg-white mb-6">
              {/* Filtros rápidos por status de O.S. e ações */}
              <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-[#006653]" />
                    Status da O.S.:
                  </span>
                  {[
                    { id: 'TODOS', label: 'Todas as O.S.', count: stats.total },
                    { id: 'Pendente', label: 'Pendentes', count: stats.pendentes, dot: 'bg-yellow-400' },
                    { id: 'Em Andamento', label: 'Em Andamento', count: stats.andamento, dot: 'bg-blue-500' },
                    { id: 'Concluído', label: 'Concluídas', count: stats.concluidos, dot: 'bg-emerald-500' },
                    { id: 'Cancelado', label: 'Canceladas', count: stats.cancelados, dot: 'bg-gray-400' },
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
                      {st.dot && <span className={`w-2 h-2 rounded-full ${st.dot}`} />}
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

                <div className="flex items-center gap-2">
                  <Button
                    onClick={fetchChamadosFromDatabase}
                    variant="outline"
                    size="sm"
                    disabled={refreshing}
                    className="gap-1.5 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 h-8 font-medium"
                    title="Recarregar chamados salvos do banco de dados"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#006653]' : ''}`} />
                    <span>{refreshing ? 'Atualizando...' : 'Recarregar Banco'}</span>
                  </Button>

                  <Button
                    onClick={exportCsv}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-[#006653] text-[#006653] hover:bg-emerald-50 h-8 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </Button>
                </div>
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
                  <Table className="w-full text-left text-xs">
                    <TableHeader className="bg-gray-50/80 border-b border-gray-200">
                      <TableRow className="uppercase font-semibold text-[11px] tracking-wider text-gray-600">
                        <TableHead className="py-3 px-4 w-[160px]">Protocolo</TableHead>
                        <TableHead className="py-3 px-4 min-w-[170px]">Cidadão</TableHead>
                        <TableHead className="py-3 px-4 min-w-[190px]">Serviço</TableHead>
                        <TableHead className="py-3 px-4 min-w-[190px]">Bairro/Endereço</TableHead>
                        <TableHead className="py-3 px-4 w-[130px]">Data</TableHead>
                        <TableHead className="py-3 px-4 w-[140px]">Status</TableHead>
                        <TableHead className="py-3 px-4 min-w-[220px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                      {filteredChamados.map((c) => {
                        const catInfo = getCategoriaInfo(c.categoria);
                        const hasFoto = c.fotos && c.fotos.length > 0;
                        const isUpdatingThis = updatingId === (c.id || c.protocolo);

                        return (
                          <TableRow
                            key={c.id || c.protocolo}
                            className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                            onClick={() => openDetail(c)}
                          >
                            {/* 1. Protocolo */}
                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-[#006653] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                                  {c.protocolo}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(c.protocolo);
                                    setCopiedProtocol(c.protocolo);
                                    setTimeout(() => setCopiedProtocol(null), 2000);
                                  }}
                                  title="Copiar Protocolo"
                                  className="text-gray-400 hover:text-emerald-700 p-0.5 rounded transition-colors"
                                >
                                  {copiedProtocol === c.protocolo ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              {c.prioridade === 'URGENTE' && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                  URGENTE
                                </span>
                              )}
                            </TableCell>

                            {/* 2. Cidadão */}
                            <TableCell className="py-3.5 px-4 min-w-[160px]">
                              <div className="font-medium text-gray-900 truncate">
                                {c.cidadao_nome || (c as any).nome_cidadao || 'Cidadão Trindadense'}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                                {(c.cidadao_telefone || (c as any).telefone_cidadao) && (
                                  <span className="inline-flex items-center gap-0.5 text-gray-600">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    {c.cidadao_telefone || (c as any).telefone_cidadao}
                                  </span>
                                )}
                                {(c as any).cpf_cidadao && (
                                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded font-mono">
                                    CPF: {(c as any).cpf_cidadao}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* 3. Serviço */}
                            <TableCell className="py-3.5 px-4 min-w-[190px]">
                              <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-[11.5px]">
                                <span>{catInfo?.emoji || '📋'}</span>
                                <span>{catInfo?.label || (c as any).categoria_servico || c.categoria}</span>
                              </div>
                              <p className="text-gray-600 text-xs line-clamp-1 mt-0.5 max-w-xs" title={c.descricao}>
                                {c.descricao || 'Sem descrição informada'}
                              </p>
                              {hasFoto && (
                                <span className="text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1 mt-0.5">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  {c.fotos?.length || 1} foto(s) anexada(s)
                                </span>
                              )}
                            </TableCell>

                            {/* 4. Bairro/Endereço */}
                            <TableCell className="py-3.5 px-4 max-w-[200px]">
                              <div className="flex items-start gap-1 text-gray-700">
                                <MapPin className="w-3.5 h-3.5 text-[#006653] flex-shrink-0 mt-0.5" />
                                <span className="truncate text-xs font-medium" title={c.endereco_texto || (c as any).endereco || 'Trindade - GO'}>
                                  {c.endereco_texto || (c as any).endereco || 'Trindade - GO'}
                                </span>
                              </div>
                              {c.secretaria && (
                                <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                                  {SECRETARIAS[c.secretaria] || c.secretaria}
                                </span>
                              )}
                            </TableCell>

                            {/* 5. Data */}
                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-gray-700 text-xs font-medium">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>{formatData(c.created_at)}</span>
                              </div>
                              <div className="text-[10.5px] text-gray-400 mt-0.5">
                                {tempoRelativo(c.created_at)}
                              </div>
                            </TableCell>

                            {/* 6. Status com Badge shadcn/ui */}
                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={c.status} />
                            </TableCell>

                            {/* 7. Ações com Select inline e Modal */}
                            <TableCell className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                {/* Select inline para alteração em tempo real */}
                                <div className="w-[145px] text-left">
                                  <Select
                                    value={normalizeStatus(c.status)}
                                    onValueChange={(val) => handleQuickStatusChange(c, val as NormalizedStatus)}
                                    disabled={isUpdatingThis}
                                  >
                                    <SelectTrigger className="h-7 text-[11px] bg-white border-gray-300 hover:border-[#006653] font-medium shadow-2xs">
                                      {isUpdatingThis ? (
                                        <span className="flex items-center gap-1 text-gray-500">
                                          <Loader2 className="w-3 h-3 animate-spin text-[#006653]" />
                                          Salvando...
                                        </span>
                                      ) : (
                                        <SelectValue />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Pendente" className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                          Pendente
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Em Andamento" className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                                          Em Andamento
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Concluído" className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                          Concluído
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Cancelado" className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                                          Cancelado
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Botão para abrir modal detalhado */}
                                <Button
                                  size="sm"
                                  onClick={() => openDetail(c)}
                                  className="bg-[#006653] hover:bg-[#005242] text-white text-xs h-7 px-2.5 gap-1 shadow-xs"
                                  title="Abrir modal para gerenciar detalhes, fotos e parecer técnico"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span className="hidden sm:inline">Gerenciar</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
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
