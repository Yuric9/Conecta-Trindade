'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { CategoriaIcone } from '@/components/categoria-icone';
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
  SECRETARIAS_ATIVAS,
  CATEGORIAS,
  normalizeCategoria,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
  LayoutGrid,
  MoreHorizontal,
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
  Send,
  HardHat,
} from 'lucide-react';
import {
  copyToClipboard,
  formatarOSParaCoordenador,
  abrirWhatsAppPara,
} from '@/lib/whatsapp-share';
import { CRONOGRAMA_OFICIAL_TRINDADE, getBairrosHoje, DIAS_SEMANA_LABELS } from '@/lib/rsu-schedule';
import { getPortalConfig, savePortalConfig } from '@/lib/config-portal';
import { authHeaders } from '@/lib/auth-headers';
import { AdminMobileNav, type AbaAdmin } from '@/components/admin-mobile-nav';
import AdminModalEncaminhar, { type DadosEncaminhamento } from '@/components/admin-modal-encaminhar';
import {
  STATUS_OS,
  STATUS_OS_INFO,
  infoStatusOS,
  normalizarStatusOS,
  osEmAberto,
  prazoVencido,
  papelOS,
  NOME_PAPEL,
  type PapelOS,
  type StatusOS,
} from '@/lib/os-status';
import AdminDialogoMotivo, { type PedidoMotivo } from '@/components/admin-dialogo-motivo';
import AdminDialogoResposta from '@/components/admin-dialogo-resposta';

type NormalizedStatus = StatusOS;
const normalizeStatus = normalizarStatusOS;

function StatusBadge({ status }: { status: string }) {
  const info = infoStatusOS(status);
  return (
    <Badge
      variant="outline"
      className={`${info.badge} font-semibold px-2.5 py-0.5 text-xs gap-1.5 shadow-2xs whitespace-nowrap`}
    >
      <span className={`w-2 h-2 rounded-full ${info.dot}`} />
      {info.label}
    </Badge>
  );
}

const KANBAN_COLUMNS: StatusOS[] = ['Pendente', 'Na Secretaria', 'Encaminhada', 'Em Andamento', 'Aguardando Confirmação', 'Concluído'];

/** Próxima etapa que a Secretaria marca à mão (quando o coordenador avisa por fora do sistema). */
const PROXIMA_ETAPA: Partial<Record<StatusOS, { status: StatusOS; label: string }>> = {
  Encaminhada: { status: 'Em Andamento', label: 'Marcar em execução' },
  'Em Andamento': { status: 'Aguardando Confirmação', label: 'Coordenador informou que terminou' },
  'Aguardando Confirmação': { status: 'Concluído', label: 'Confirmar conclusão' },
};

// Colunas da tabela de O.S. (cabeçalho e linhas usam a mesma grade)
const GRADE_TABELA_OS =
  'grid-cols-[150px_minmax(130px,1fr)_minmax(170px,1.2fr)_minmax(170px,1.2fr)_150px_100px_200px_215px]';

/** "faltam 2 dias", "faltam 5 h", "vence em minutos" */
function prazoRestante(sla: string): string {
  const horas = (new Date(sla).getTime() - Date.now()) / 3600000;
  if (horas < 1) return 'vence em minutos';
  if (horas < 24) return `faltam ${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`;
}

const BOTAO_ETAPA: Partial<Record<StatusOS, { label: string; title: string; cls: string }>> = {
  Encaminhada: {
    label: 'Iniciou',
    title: 'Coordenador iniciou o serviço',
    cls: 'border-blue-300 text-blue-800 hover:bg-blue-50',
  },
  'Em Andamento': {
    label: 'Executada',
    title: 'Coordenador informou que terminou (falta a confirmação)',
    cls: 'border-cyan-300 text-cyan-800 hover:bg-cyan-50',
  },
  'Aguardando Confirmação': {
    label: 'Confirmar',
    title: 'Confirmar a conclusão: o cidadão passa a ver como concluída',
    cls: 'border-emerald-400 text-emerald-800 hover:bg-emerald-50',
  },
};

/** Passos que pedem motivo antes de gravar */
type TipoMotivo = 'cancelar' | 'devolver_central' | 'retirar' | 'recusar';

const PEDIDOS_MOTIVO: Record<
  TipoMotivo,
  { status: StatusOS; titulo: string; explicacao: string; rotulo: string; botao: string; sucesso: string; perigo?: boolean }
> = {
  cancelar: {
    status: 'Cancelado',
    titulo: 'Cancelar O.S.',
    explicacao: 'A O.S. é encerrada sem execução e o cidadão passa a ver como cancelada.',
    rotulo: 'Motivo do cancelamento',
    botao: 'Cancelar O.S.',
    sucesso: 'cancelada',
    perigo: true,
  },
  devolver_central: {
    status: 'Pendente',
    titulo: 'Devolver à central',
    explicacao: 'Use quando o pedido não é da Infraestrutura ou falta informação. A central analisa de novo.',
    rotulo: 'Por que está voltando',
    botao: 'Devolver à central',
    sucesso: 'devolvida à central',
  },
  retirar: {
    status: 'Na Secretaria',
    titulo: 'Tirar do coordenador',
    explicacao: 'A O.S. volta para a fila da Secretaria, sem coordenador, para ser encaminhada de novo.',
    rotulo: 'Por que está saindo do coordenador',
    botao: 'Tirar do coordenador',
    sucesso: 'voltou para a fila da Secretaria',
  },
  recusar: {
    status: 'Em Andamento',
    titulo: 'Não aceitar a execução',
    explicacao: 'A O.S. volta para o coordenador, em execução.',
    rotulo: 'O que ainda falta fazer',
    botao: 'Devolver ao coordenador',
    sucesso: 'devolvida ao coordenador',
  },
};

/** O que cada botão/menu da O.S. faz (montado pela página) */
interface AcoesOS {
  enviarSecretaria: () => void;
  encaminhar: () => void;
  avancar: (status: StatusOS) => void;
  pedirMotivo: (tipo: TipoMotivo) => void;
  avisar: () => void;
  responder: () => void;
  cobrar: () => void;
  copiarEndereco: () => void;
  abrir: () => void;
}

/** Concluída ou cancelada e a central ainda não respondeu ao cidadão */
const faltaResponder = (c: Chamado) => !osEmAberto(c.status) && !c.resposta_cidadao;
/** Está com a Secretaria (pode ser cobrada pela central) */
const comSecretaria = (c: Chamado) =>
  ['Na Secretaria', 'Encaminhada', 'Em Andamento', 'Aguardando Confirmação'].includes(normalizarStatusOS(c.status));

const ehSecretaria = (papel: PapelOS | null) => papel === 'secretaria' || papel === 'admin';
const ehCentral = (papel: PapelOS | null) => papel === 'central' || papel === 'admin';

/** "Cobrada pelo cidadão" (O.S. em aberto) e "Falta responder" (O.S. encerrada) */
function SinaisCentral({ chamado }: { chamado: Chamado }) {
  if (osEmAberto(chamado.status) && (chamado.cobrancas || 0) > 0) {
    return (
      <span
        className="mt-1 flex w-fit items-center gap-1 text-[10px] font-semibold text-amber-800"
        title={chamado.cobrado_em ? `Última cobrança: ${formatData(chamado.cobrado_em)}` : undefined}
      >
        🔔 Cobrada{(chamado.cobrancas || 0) > 1 ? ` (${chamado.cobrancas}x)` : ''}
      </span>
    );
  }
  if (faltaResponder(chamado)) {
    return <span className="mt-1 block text-[10px] font-semibold text-amber-700">Falta responder ao cidadão</span>;
  }
  return null;
}

/** Botão do próximo passo da O.S. na linha, de acordo com quem está logado. */
function AcaoPrincipalOS({ chamado, papel, ocupado, acoes }: { chamado: Chamado; papel: PapelOS | null; ocupado: boolean; acoes: AcoesOS }) {
  const status = normalizarStatusOS(chamado.status);
  if (faltaResponder(chamado) && ehCentral(papel)) {
    return (
      <Button size="sm" onClick={acoes.responder} disabled={ocupado} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold">
        <MessageCircle className="w-3.5 h-3.5" />
        Responder
      </Button>
    );
  }
  if (status === 'Pendente' && ehCentral(papel)) {
    return (
      <Button size="sm" onClick={acoes.enviarSecretaria} disabled={ocupado} className="bg-[#006653] hover:bg-[#005242] text-white text-xs h-8 px-3 gap-1.5 font-semibold">
        <Send className="w-3.5 h-3.5" />
        Enviar à Secretaria
      </Button>
    );
  }
  if (status === 'Na Secretaria' && ehSecretaria(papel)) {
    return (
      <Button size="sm" onClick={acoes.encaminhar} disabled={ocupado} className="bg-violet-700 hover:bg-violet-800 text-white text-xs h-8 px-3 gap-1.5 font-semibold">
        <HardHat className="w-3.5 h-3.5" />
        Encaminhar
      </Button>
    );
  }
  const proxima = PROXIMA_ETAPA[status];
  const botao = BOTAO_ETAPA[status];
  if (!proxima || !botao || !ehSecretaria(papel)) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => acoes.avancar(proxima.status)}
      disabled={ocupado}
      title={botao.title}
      className={`text-xs h-8 px-3 gap-1 font-semibold bg-white ${botao.cls}`}
    >
      {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
      {botao.label}
    </Button>
  );
}

function OSContextMenu({ chamado, papel, enabled, acoes }: { chamado: Chamado; papel: PapelOS | null; enabled: boolean; acoes: AcoesOS }) {
  if (!enabled) {
    return (
      <Button size="sm" variant="outline" onClick={acoes.abrir} className="text-xs h-8 px-2.5 gap-1 border-gray-300 bg-white" title="Abrir O.S.">
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Abrir</span>
      </Button>
    );
  }
  const status = normalizarStatusOS(chamado.status);
  const proxima = PROXIMA_ETAPA[status];
  const comCoordenador = status === 'Encaminhada' || status === 'Em Andamento';
  const podeCancelar = (papel === 'central' && status === 'Pendente') || (papel === 'admin' && osEmAberto(status));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300 bg-white" onClick={(e) => e.stopPropagation()} title="Ações da O.S.">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {status === 'Pendente' && ehCentral(papel) && (
          <DropdownMenuItem onSelect={acoes.enviarSecretaria}>
            <Send className="w-4 h-4 mr-2 text-indigo-600" />
            Enviar à Secretaria
          </DropdownMenuItem>
        )}
        {status === 'Na Secretaria' && ehSecretaria(papel) && (
          <>
            <DropdownMenuItem onSelect={acoes.encaminhar}>
              <HardHat className="w-4 h-4 mr-2 text-violet-600" />
              Encaminhar ao coordenador
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => acoes.pedirMotivo('devolver_central')}>
              <RotateCcw className="w-4 h-4 mr-2 text-gray-600" />
              Devolver à central…
            </DropdownMenuItem>
          </>
        )}
        {comCoordenador && ehSecretaria(papel) && (
          <DropdownMenuItem onSelect={acoes.encaminhar}>
            <HardHat className="w-4 h-4 mr-2 text-violet-600" />
            Trocar coordenador
          </DropdownMenuItem>
        )}
        {proxima && ehSecretaria(papel) && (
          <DropdownMenuItem onSelect={() => acoes.avancar(proxima.status)}>
            <ArrowRight className="w-4 h-4 mr-2 text-blue-600" />
            {proxima.label}
          </DropdownMenuItem>
        )}
        {status === 'Aguardando Confirmação' && ehSecretaria(papel) && (
          <DropdownMenuItem onSelect={() => acoes.pedirMotivo('recusar')}>
            <RotateCcw className="w-4 h-4 mr-2 text-orange-600" />
            Não aceitar a execução…
          </DropdownMenuItem>
        )}
        {comCoordenador && ehSecretaria(papel) && (
          <>
            <DropdownMenuItem onSelect={acoes.avisar}>
              <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
              Avisar coordenador no WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => acoes.pedirMotivo('retirar')}>
              <RotateCcw className="w-4 h-4 mr-2 text-gray-600" />
              Tirar do coordenador…
            </DropdownMenuItem>
          </>
        )}
        {comSecretaria(chamado) && ehCentral(papel) && (
          <DropdownMenuItem onSelect={acoes.cobrar}>
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
            Registrar cobrança do cidadão…
          </DropdownMenuItem>
        )}
        {!osEmAberto(status) && ehCentral(papel) && (
          <DropdownMenuItem onSelect={acoes.responder}>
            <MessageCircle className="w-4 h-4 mr-2 text-[#006653]" />
            {chamado.resposta_cidadao ? 'Ver / editar resposta ao cidadão' : 'Responder ao cidadão'}
          </DropdownMenuItem>
        )}
        {podeCancelar && (
          <DropdownMenuItem onSelect={() => acoes.pedirMotivo('cancelar')} className="text-red-700">
            <X className="w-4 h-4 mr-2" />
            Cancelar O.S.…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={acoes.copiarEndereco}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar endereço
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={acoes.abrir}>
          <Eye className="w-4 h-4 mr-2 text-[#006653]" />
          Abrir O.S. completa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  const [osViewMode, setOsViewMode] = useState<'table' | 'cards'>('table');
  // No celular a tabela não cabe: começa no modo cartões.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setOsViewMode('cards');
  }, []);
  const [menuContextoAtivo, setMenuContextoAtivo] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterCategoria, setFilterCategoria] = useState<ChamadoCategoria | 'TODAS'>('TODAS');
  // 'TODOS', 'SEM' (sem coordenador) ou o id do coordenador
  const [filterCoordenador, setFilterCoordenador] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtrasado, setFilterAtrasado] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewChamadoOpen, setIsNewChamadoOpen] = useState(false);
  // Janela de encaminhar: a central envia à Secretaria; a Secretaria escolhe o coordenador
  const [encaminhar, setEncaminhar] = useState<{ chamado: Chamado; destino: 'secretaria' | 'coordenador' } | null>(null);
  const [pedidoMotivo, setPedidoMotivo] = useState<PedidoMotivo | null>(null);
  const [respondendo, setRespondendo] = useState<Chamado | null>(null);
  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'chamados' | 'usuarios' | 'orgaos' | 'mapa' | 'rsu' | 'relatorios' | 'configuracoes'
  >('chamados');

  const isFiscalOrAdmin = Boolean(
    isAdmin ||
    profile?.role === 'admin' ||
    profile?.role === 'fiscal' ||
    profile?.role === 'gestor' ||
    profile?.role === 'atendente'
  );

  // Papel no fluxo da O.S. Sem banco (demonstração) a tela mostra tudo, como admin.
  const papel: PapelOS | null = !isSupabaseConfigured ? 'admin' : isAdmin ? 'admin' : papelOS(profile);
  // Usuários, prédios, coleta e configurações são só do administrador
  const abasPermitidas: AbaAdmin[] =
    papel === 'admin'
      ? ['dashboard', 'chamados', 'usuarios', 'orgaos', 'mapa', 'rsu', 'relatorios', 'configuracoes']
      : ['dashboard', 'chamados', 'mapa', 'relatorios'];

  // Cada um começa vendo a própria fila
  const [filaInicialAplicada, setFilaInicialAplicada] = useState(false);
  useEffect(() => {
    if (filaInicialAplicada || !papel) return;
    if (papel === 'central') setFilterStatus('Pendente');
    if (papel === 'secretaria') setFilterStatus('Na Secretaria');
    setFilaInicialAplicada(true);
  }, [papel, filaInicialAplicada]);

  // Cadastros: o admin vê todos; o resto da equipe só recebe dos
  // coordenadores o necessário para encaminhar (proteção de dados).
  useEffect(() => {
    if (!isSupabaseConfigured || !papel) return;
    const carregarTodos = () =>
      (supabase.from('profiles') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: Profile[] | null; error: any }) => {
          if (error) console.error('Erro ao carregar usuários:', error);
          setProfiles(data || []);
        });
    if (papel === 'admin') {
      carregarTodos();
      return;
    }
    (supabase as any).rpc('equipe_coordenadores').then(({ data, error }: { data: any[] | null; error: any }) => {
      if (error) {
        console.error('Erro ao carregar coordenadores:', error);
        return;
      }
      setProfiles(
        (data || []).map((c) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone ?? undefined,
          servicos: c.servicos || [],
          status: c.status || 'ativo',
          role: 'coordenador',
          email: '',
          created_at: '',
        }))
      );
    });
  }, [papel]);

  // Coordenador não usa o painel: tem a tela própria com as O.S. dele
  useEffect(() => {
    if (profile?.role === 'coordenador') router.replace('/coordenador');
  }, [profile?.role, router]);

  const fetchChamadosFromDatabase = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Tentar buscar da API /api/chamados
      let apiChamados: any[] = [];
      try {
        const res = await fetch('/api/chamados?limit=100', { cache: 'no-store', headers: await authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.chamados)) {
            apiChamados = data.chamados;
          }
        }
      } catch (apiErr) {
        console.warn('API /api/chamados inacessível, usando armazenamento local:', apiErr);
      }

      // 2. Dados locais do navegador só existem no modo demonstração.
      //    Com o banco configurado, o painel mostra apenas chamados reais.
      const localChamados = isSupabaseConfigured ? [] : getStoredChamadosList();

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
          // Sem localização salva, o chamado não aparece no mapa (antes
          // todos caíam empilhados no centro da cidade).
          latitude: c.latitude ?? existing?.latitude ?? (null as any),
          longitude: c.longitude ?? existing?.longitude ?? (null as any),
          fotos: c.foto_url ? [c.foto_url] : (c.fotos || existing?.fotos || []),
          status: (c.status || existing?.status || 'ABERTO') as ChamadoStatus,
          prioridade: c.prioridade || existing?.prioridade || 'MEDIA',
          secretaria: c.secretaria ?? existing?.secretaria ?? null,
          sla_limite: c.sla_limite ?? existing?.sla_limite,
          observacoes_internas: c.observacoes_internas ?? existing?.observacoes_internas,
          resposta_cidadao: c.resposta_cidadao ?? existing?.resposta_cidadao,
          coordenador_id: c.coordenador_id ?? existing?.coordenador_id ?? null,
          encaminhado_em: c.encaminhado_em ?? existing?.encaminhado_em ?? null,
          iniciado_em: c.iniciado_em ?? existing?.iniciado_em ?? null,
          executado_em: c.executado_em ?? existing?.executado_em ?? null,
          concluido_em: c.concluido_em ?? existing?.concluido_em ?? null,
          visualizado_em: c.visualizado_em ?? existing?.visualizado_em ?? null,
          foto_execucao_url: c.foto_execucao_url ?? existing?.foto_execucao_url ?? null,
          respondido_em: c.respondido_em ?? existing?.respondido_em ?? null,
          cobrado_em: c.cobrado_em ?? existing?.cobrado_em ?? null,
          cobrancas: c.cobrancas ?? existing?.cobrancas ?? 0,
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
      setChamados(isSupabaseConfigured ? [] : getStoredChamadosList());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChamadosFromDatabase();

    if (!isSupabaseConfigured) setProfiles(getStoredProfiles());

    const loadedOrgaos = getStoredOrgaos();
    setOrgaos(loadedOrgaos);

    const loadedConfig = getCityConfig();
    setCityConfig(loadedConfig);
    getPortalConfig().then((config) => setMenuContextoAtivo(config.menu_contexto_cards_ativo));
  }, [fetchChamadosFromDatabase]);

  const selecionarAba = (id: AbaAdmin) => {
    setAdminTab(id);
    if (id === 'mapa') setView('mapa');
    if (id === 'chamados' && view === 'mapa') setView('os');
  };

  // Coordenadores ativos (quem pode receber O.S.)
  const coordenadores = useMemo(
    () => profiles.filter((p) => p.role === 'coordenador' && (p.status || 'ativo') === 'ativo'),
    [profiles]
  );
  const nomeCoordenador = useCallback(
    (id?: string | null) => (id ? profiles.find((p) => p.id === id)?.nome || 'Coordenador' : null),
    [profiles]
  );

  const avisoTemporario = (type: 'success' | 'error', text: string, ms = 4000) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), ms);
  };

  /**
   * Grava alterações de uma O.S. pela API (as regras do fluxo valem no banco).
   * `motivo` vai para o histórico. Devolve null se deu certo ou a mensagem de erro.
   */
  const atualizarOS = async (
    chamado: Chamado,
    alteracoes: Partial<Chamado>,
    motivo?: string
  ): Promise<string | null> => {
    const chave = chamado.id || chamado.protocolo;
    const agora = new Date().toISOString();
    const atualizado: Chamado = { ...chamado, ...alteracoes, updated_at: agora };
    // Datas das etapas (o banco grava as definitivas; aqui é só para a tela)
    if (alteracoes.status && normalizarStatusOS(alteracoes.status) !== normalizarStatusOS(chamado.status)) {
      const st = normalizarStatusOS(alteracoes.status);
      if (st === 'Encaminhada') atualizado.encaminhado_em = agora;
      if (st === 'Em Andamento') atualizado.iniciado_em = chamado.iniciado_em || agora;
      if (st === 'Aguardando Confirmação') atualizado.executado_em = agora;
      if (st === 'Concluído') atualizado.concluido_em = agora;
    }

    setUpdatingId(chave);
    try {
      const res = await fetch('/api/chamados', {
        method: 'PATCH',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          id: chamado.id,
          protocolo: chamado.protocolo,
          ...alteracoes,
          ...(alteracoes.status ? { status: normalizarStatusOS(alteracoes.status) } : {}),
          motivo: motivo || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return data.error || 'Não foi possível salvar a O.S.';

      // Com o banco, usa o que foi gravado (datas definitivas do gatilho)
      const gravado: Chamado = isSupabaseConfigured && data.chamado?.protocolo
        ? {
            ...atualizado,
            status: data.chamado.status ?? atualizado.status,
            coordenador_id: data.chamado.coordenador_id ?? null,
            encaminhado_em: data.chamado.encaminhado_em ?? atualizado.encaminhado_em,
            iniciado_em: data.chamado.iniciado_em ?? atualizado.iniciado_em,
            executado_em: data.chamado.executado_em ?? atualizado.executado_em,
            concluido_em: data.chamado.concluido_em ?? null,
            respondido_em: data.chamado.respondido_em ?? atualizado.respondido_em ?? null,
            updated_at: data.chamado.updated_at ?? agora,
          }
        : atualizado;
      setChamados((prev) => prev.map((c) => (c.id === chamado.id || c.protocolo === chamado.protocolo ? gravado : c)));
      if (!isSupabaseConfigured) saveStoredChamadoItem(gravado);
      return null;
    } catch (err) {
      console.error('Erro ao atualizar O.S.:', err);
      return 'Sem conexão com o servidor. Tente novamente.';
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickStatusChange = async (chamado: Chamado, newStatus: NormalizedStatus) => {
    const erro = await atualizarOS(chamado, { status: newStatus as ChamadoStatus });
    if (erro) avisoTemporario('error', `O.S. ${chamado.protocolo}: ${erro}`, 6000);
    else avisoTemporario('success', `O.S. ${chamado.protocolo}: ${STATUS_OS_INFO[newStatus].label}.`);
  };

  const handleEncaminhar = async (chamado: Chamado, dados: DadosEncaminhamento) => {
    const status = normalizarStatusOS(chamado.status);
    return atualizarOS(
      chamado,
      {
        // Já com coordenador e só trocando: a etapa continua a mesma
        ...(status === 'Pendente' || status === 'Na Secretaria' ? { status: 'Encaminhada' as ChamadoStatus } : {}),
        coordenador_id: dados.coordenador_id,
        secretaria: 'INFRAESTRUTURA',
        prioridade: dados.prioridade,
        sla_limite: dados.sla_limite,
      },
      dados.observacao
    );
  };

  // Central → Secretaria de Infraestrutura
  const handleEnviarSecretaria = async (chamado: Chamado, dados: DadosEncaminhamento) =>
    atualizarOS(
      chamado,
      {
        status: 'Na Secretaria' as ChamadoStatus,
        secretaria: 'INFRAESTRUTURA',
        prioridade: dados.prioridade,
        sla_limite: dados.sla_limite,
      },
      dados.observacao
    );

  const pedirMotivo = (chamado: Chamado, tipo: TipoMotivo) => {
    const cfg = PEDIDOS_MOTIVO[tipo];
    setPedidoMotivo({
      titulo: cfg.titulo,
      explicacao: cfg.explicacao,
      rotulo: cfg.rotulo,
      botao: cfg.botao,
      perigo: cfg.perigo,
      protocolo: chamado.protocolo,
      confirmar: async (motivo) => {
        const erro = await atualizarOS(chamado, { status: cfg.status as ChamadoStatus }, motivo);
        if (!erro) avisoTemporario('success', `O.S. ${chamado.protocolo} ${cfg.sucesso}.`);
        return erro;
      },
    });
  };

  // A central responde ao cidadão (aparece em "Acompanhar")
  const handleSalvarResposta = async (chamado: Chamado, resposta: string) => {
    const erro = await atualizarOS(chamado, { resposta_cidadao: resposta, respondido_em: new Date().toISOString() });
    if (!erro) avisoTemporario('success', `Resposta da O.S. ${chamado.protocolo} salva.`);
    return erro;
  };

  // A central registra que o cidadão cobrou; a Secretaria vê "Cobrada"
  const pedirCobranca = (chamado: Chamado) => {
    setPedidoMotivo({
      titulo: 'Registrar cobrança do cidadão',
      explicacao: 'Fica no histórico e a O.S. aparece como "Cobrada" para a Secretaria de Infraestrutura.',
      rotulo: 'O que o cidadão cobrou (e como: ligação, WhatsApp, balcão)',
      botao: 'Registrar cobrança',
      protocolo: chamado.protocolo,
      confirmar: async (texto) => {
        if (isSupabaseConfigured) {
          const { error } = await (supabase as any).rpc('registrar_cobranca', { p_chamado: chamado.id, p_texto: texto });
          if (error) return error.message || 'Não foi possível registrar a cobrança.';
        }
        const atualizado: Chamado = {
          ...chamado,
          cobrancas: (chamado.cobrancas || 0) + 1,
          cobrado_em: new Date().toISOString(),
        };
        setChamados((prev) => prev.map((c) => (c.id === chamado.id ? atualizado : c)));
        if (!isSupabaseConfigured) saveStoredChamadoItem(atualizado);
        avisoTemporario('success', `Cobrança da O.S. ${chamado.protocolo} registrada.`);
        return null;
      },
    });
  };

  const acoesDaOS = (c: Chamado): AcoesOS => ({
    enviarSecretaria: () => setEncaminhar({ chamado: c, destino: 'secretaria' }),
    encaminhar: () => setEncaminhar({ chamado: c, destino: 'coordenador' }),
    avancar: (st) => handleQuickStatusChange(c, st),
    pedirMotivo: (tipo) => pedirMotivo(c, tipo),
    avisar: () => handleAvisarCoordenador(c),
    responder: () => setRespondendo(c),
    cobrar: () => pedirCobranca(c),
    copiarEndereco: () => handleCopyAddress(c),
    abrir: () => openDetail(c),
  });

  const handleAvisarCoordenador = (chamado: Chamado) => {
    const coord = profiles.find((p) => p.id === chamado.coordenador_id);
    if (!coord) return;
    abrirWhatsAppPara(
      coord.telefone,
      formatarOSParaCoordenador({
        protocolo: chamado.protocolo,
        categoria: chamado.categoria,
        coordenadorNome: coord.nome,
        prioridade: chamado.prioridade,
        sla_limite: chamado.sla_limite,
        endereco: chamado.endereco_texto,
        descricao: chamado.descricao,
        cidadao_nome: chamado.cidadao_nome,
        cidadao_telefone: chamado.cidadao_telefone,
        latitude: chamado.latitude,
        longitude: chamado.longitude,
      })
    );
  };


  const filteredChamados = useMemo(() => {
    return chamados.filter((c) => {
      // Filas especiais: além das etapas, "Responder ao cidadão" e "Cobradas"
      if (filterStatus === 'RESPONDER') {
        if (!faltaResponder(c)) return false;
      } else if (filterStatus === 'COBRADAS') {
        if (!osEmAberto(c.status) || !(c.cobrancas || 0)) return false;
      } else if (filterStatus !== 'TODOS') {
        const norm = normalizeStatus(c.status);
        if (norm !== filterStatus) return false;
      }
      if (filterCategoria !== 'TODAS' && normalizeCategoria(c.categoria) !== filterCategoria) return false;
      if (filterCoordenador === 'SEM' && c.coordenador_id) return false;
      if (filterCoordenador !== 'TODOS' && filterCoordenador !== 'SEM' && c.coordenador_id !== filterCoordenador) return false;
      if (filterAtrasado && !prazoVencido(c)) return false;
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
  }, [chamados, filterStatus, filterCategoria, filterCoordenador, filterAtrasado, searchTerm]);

  const stats = useMemo(() => {
    const porStatus = (st: StatusOS) => chamados.filter((c) => normalizeStatus(c.status) === st).length;
    const total = chamados.length;
    const pendentes = porStatus('Pendente');
    const concluidos = porStatus('Concluído');
    return {
      total,
      pendentes,
      abertos: pendentes,
      naSecretaria: porStatus('Na Secretaria'),
      encaminhadas: porStatus('Encaminhada'),
      andamento: porStatus('Em Andamento'),
      aguardando: porStatus('Aguardando Confirmação'),
      resolvidos: concluidos,
      concluidos,
      cancelados: porStatus('Cancelado'),
      atrasados: chamados.filter((c) => prazoVencido(c)).length,
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
    return (Object.entries(SECRETARIAS_ATIVAS) as [ChamadoSecretaria, string][]).map(([id, label]) => {
      const items = chamados.filter((c) => c.secretaria === id);
      return {
        id,
        label,
        total: items.length,
        resolvidos: items.filter((c) => normalizeStatus(c.status) === 'Concluído').length,
        pendentes: items.filter((c) => osEmAberto(c.status)).length,
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
    const header = ['O.S. (Ordem de Serviço)', 'Categoria', 'Status', 'Coordenador', 'Prazo', 'Prazo vencido', 'Secretaria', 'Endereço', 'Criado em', 'Concluído em'];
    const rows = chamados.map((c) => [
      c.protocolo,
      getCategoriaInfo(c.categoria)?.label || c.categoria,
      infoStatusOS(c.status).label,
      nomeCoordenador(c.coordenador_id) || '',
      c.sla_limite ? formatData(c.sla_limite) : '',
      prazoVencido(c) ? 'Sim' : 'Não',
      c.secretaria ? SECRETARIAS[c.secretaria] : 'Não atribuída',
      c.endereco_texto || '',
      formatData(c.created_at),
      c.concluido_em ? formatData(c.concluido_em) : '',
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

  const handleSaveChamado = async (updated: Chamado, motivo?: string): Promise<string | null> => {
    const anterior = chamados.find((c) => c.id === updated.id || c.protocolo === updated.protocolo) || updated;
    const novoStatus = normalizeStatus(updated.status);
    const erro = await atualizarOS(
      anterior,
      {
        // Status só vai quando muda (reenviar "Cancelado" pediria motivo de novo)
        ...(novoStatus !== normalizeStatus(anterior.status) ? { status: novoStatus as ChamadoStatus } : {}),
        coordenador_id: updated.coordenador_id ?? null,
        secretaria: updated.secretaria ?? null,
        prioridade: updated.prioridade || 'MEDIA',
        // null apaga o campo no banco (undefined não seria enviado)
        sla_limite: updated.sla_limite ?? (null as unknown as undefined),
        observacoes_internas: updated.observacoes_internas ?? (null as unknown as undefined),
        resposta_cidadao: updated.resposta_cidadao ?? (null as unknown as undefined),
      },
      motivo
    );
    if (!erro) avisoTemporario('success', `O.S. ${updated.protocolo} salva.`);
    return erro;
  };

  const handleDeleteChamado = async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await (supabase.from('chamados') as any).delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir chamado:', error);
        setFeedbackMessage({ type: 'error', text: 'Não foi possível excluir a O.S. (apenas administradores podem excluir).' });
        return;
      }
    } else {
      deleteStoredChamadoItem(id);
    }
    setChamados((prev) => prev.filter((c) => c.id !== id));
    if (selectedChamado?.id === id) {
      setSelectedChamado(null);
      setIsEditModalOpen(false);
    }
  };

  // Com o banco configurado, a abertura manual usa o formulário completo
  // (/solicitar), que grava nome, CPF e endereço exigidos pela tabela.
  useEffect(() => {
    if (isNewChamadoOpen && isSupabaseConfigured) {
      setIsNewChamadoOpen(false);
      router.push('/solicitar');
    }
  }, [isNewChamadoOpen, router]);

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

  /** Salva um usuário. Com `senha`, cria a conta de login (rota do servidor, só admin). */
  const handleSaveProfile = async (updated: Profile, senha?: string): Promise<string | null> => {
    let salvo: Profile = updated;

    if (isSupabaseConfigured && senha) {
      try {
        const res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            nome: updated.nome,
            email: updated.email,
            senha,
            cpf: updated.cpf ?? null,
            telefone: updated.telefone ?? null,
            role: updated.role,
            secretaria: updated.secretaria ?? null,
            cargo: updated.cargo ?? null,
            servicos: updated.servicos ?? [],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return data.error || 'Não foi possível criar a conta.';
        salvo = data.profile as Profile;
      } catch {
        return 'Sem conexão com o servidor. Tente novamente.';
      }
    } else if (isSupabaseConfigured) {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          nome: updated.nome,
          telefone: updated.telefone ?? null,
          role: updated.role,
          secretaria: updated.secretaria ?? null,
          cargo: updated.cargo ?? null,
          servicos: updated.servicos ?? [],
          status: updated.status ?? 'ativo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', updated.id);
      if (error) {
        console.error('Erro ao salvar usuário:', error);
        return 'Não foi possível salvar o usuário.';
      }
    } else {
      saveStoredProfile(updated);
    }

    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === salvo.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = salvo;
        return next;
      }
      return [salvo, ...prev];
    });
    avisoTemporario('success', senha ? `Conta de ${salvo.nome} criada.` : `Usuário ${salvo.nome} salvo.`);
    return null;
  };

  /** Admin define senha nova para conta da equipe (a senha vai direto ao Supabase). */
  const handleDefinirSenha = async (perfil: Profile, senha: string): Promise<string | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const res = await fetch('/api/usuarios/senha', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: perfil.id, senha }),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok && data.success ? null : data.error || 'Não foi possível trocar a senha.';
    } catch {
      return 'Sem conexão com o servidor. Tente novamente.';
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await (supabase.from('profiles') as any).delete().eq('id', id);
      if (error) {
        console.error('Erro ao remover usuário:', error);
        setFeedbackMessage({ type: 'error', text: 'Não foi possível remover o usuário.' });
        return;
      }
    } else {
      deleteStoredProfile(id);
    }
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

  const handleToggleContextMenu = async () => {
    const next = !menuContextoAtivo;
    setMenuContextoAtivo(next);
    try { await savePortalConfig({ menu_contexto_cards_ativo: next }); setFeedbackMessage({ type: 'success', text: `Menu de ações contextuais ${next ? 'ativado' : 'desativado'}.` }); }
    catch { setMenuContextoAtivo(!next); setFeedbackMessage({ type: 'error', text: 'Não foi possível salvar a preferência do menu de contexto.' }); }
    setTimeout(() => setFeedbackMessage(null), 3000);
  };
  const handleCopyAddress = async (chamado: Chamado) => { const ok = await copyToClipboard(chamado.endereco_texto || (chamado as any).endereco || 'Trindade - GO'); setFeedbackMessage({ type: ok ? 'success' : 'error', text: ok ? 'Endereço copiado para a área de transferência.' : 'Não foi possível copiar o endereço.' }); setTimeout(() => setFeedbackMessage(null), 2500); };

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
              <strong>Ambiente de Fiscalização Conecta-Trindade (Modo Demonstração):</strong> Os dados ficam só neste navegador.
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
      <div className="ct-malha-urbana text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-5 md:pb-0 md:pt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading">
              {papel === 'central' || papel === 'secretaria' ? NOME_PAPEL[papel] : 'Painel de gestão'}
            </h1>
            <p className="text-emerald-50/90 text-sm mt-0.5">
              {profile?.nome ? `Olá, ${profile.nome.split(' ')[0]}` : 'Conecta Trindade'}
            </p>
          </div>
        </div>


        <nav className="hidden md:flex w-full px-4 sm:px-6 lg:px-8 mt-4 gap-1 overflow-x-auto" aria-label="Seções do painel">
          {[
            { id: 'dashboard' as const, label: 'Visão geral', icon: LayoutDashboard },
            { id: 'chamados' as const, label: 'Ordens de Serviço', icon: ClipboardList, badge: chamados.length },
            { id: 'usuarios' as const, label: 'Usuários', icon: UsersRound, badge: profiles.length },
            { id: 'orgaos' as const, label: 'Prédios públicos', icon: Building2, badge: orgaos.length },
            { id: 'mapa' as const, label: 'Mapa', icon: MapPinned },
            { id: 'rsu' as const, label: 'Coleta de lixo', icon: Truck },
            { id: 'relatorios' as const, label: 'Relatórios', icon: BarChart3 },
            { id: 'configuracoes' as const, label: 'Configurações', icon: Settings },
          ]
            .filter((item) => abasPermitidas.includes(item.id))
            .map((item) => {
            const Icon = item.icon;
            const active = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selecionarAba(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'text-white border-[#FFC20E]'
                    : 'text-emerald-50/80 border-transparent hover:text-white hover:border-white/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-[11px] px-1.5 rounded-full bg-white/20 text-white">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

        {/* Números: clicar filtra a lista de O.S. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Novas (central)', value: stats.pendentes, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', status: 'Pendente', atrasado: false },
            { label: 'Na Secretaria', value: stats.naSecretaria, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', status: 'Na Secretaria', atrasado: false },
            { label: 'Em execução', value: stats.andamento, icon: Timer, color: 'text-blue-600', bg: 'bg-blue-50', status: 'Em Andamento', atrasado: false },
            { label: 'Aguardando confirmação', value: stats.aguardando, icon: CheckCircle2, color: 'text-cyan-700', bg: 'bg-cyan-50', status: 'Aguardando Confirmação', atrasado: false },
            { label: 'Prazo vencido', value: stats.atrasados, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', status: 'TODOS', atrasado: true },
          ].map((stat) => {
            const Icon = stat.icon;
            const ativo = adminTab === 'chamados' && (stat.atrasado ? filterAtrasado : !filterAtrasado && filterStatus === stat.status);
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => {
                  setAdminTab('chamados');
                  if (view === 'mapa') setView('os');
                  setFilterStatus(stat.status);
                  setFilterAtrasado(stat.atrasado);
                }}
                className={`group text-left bg-white rounded-lg border p-3 sm:p-4 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006653] ${
                  ativo ? 'border-[#006653] ring-1 ring-[#006653]' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md ${stat.bg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight tabular-nums">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500 leading-snug">{stat.label}</p>
                  </div>
                </div>
              </button>
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
                          <CategoriaIcone categoria={categoryInfo.id} className="w-5 h-5" />
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
              onDefinirSenha={handleDefinirSenha}
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
                    Bairros e frequência de coleta
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
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-full overflow-x-auto [&>button]:shrink-0">
                <button
                  onClick={() => { setView('os'); setOsViewMode('table'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    view === 'os' && osViewMode === 'table' ? 'bg-[#006653] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Visualização em Lista de Ordens de Serviço"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Tabela</span>
                </button>
                <button onClick={() => { setView('os'); setOsViewMode('cards'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'os' && osViewMode === 'cards' ? 'bg-[#006653] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`} title="Ver em cartões"><LayoutGrid className="w-3.5 h-3.5"/><span>Cartões</span></button>
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
                  title="Ver no mapa"
                >
                  <MapPinned className="w-3.5 h-3.5" />
                  <span>Mapa</span>
                </button>
              </div>

              <div className="relative w-full basis-full md:basis-auto md:w-auto md:min-w-[200px] flex-1 md:max-w-xs">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar por O.S., rua, descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-9 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>

              {/* No celular os filtros ficam recolhidos atrás do botão "Filtros" */}
              <button
                type="button"
                onClick={() => setFiltrosAbertos((v) => !v)}
                aria-expanded={filtrosAbertos}
                className="md:hidden flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700"
              >
                <Filter className="w-4 h-4" />
                Filtros
                {(filterCategoria !== 'TODAS' ? 1 : 0) + (filterCoordenador !== 'TODOS' ? 1 : 0) + (filterAtrasado ? 1 : 0) > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#006653] text-white text-[10px] leading-[18px] text-center">
                    {(filterCategoria !== 'TODAS' ? 1 : 0) + (filterCoordenador !== 'TODOS' ? 1 : 0) + (filterAtrasado ? 1 : 0)}
                  </span>
                )}
              </button>

              <div className={`${filtrosAbertos ? 'flex' : 'hidden'} w-full flex-wrap items-center gap-3 md:contents`}>
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
                          <CategoriaIcone categoria={cat.id} className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-gray-400" />
                <Select value={filterCoordenador} onValueChange={setFilterCoordenador}>
                  <SelectTrigger className="w-[190px] h-9 bg-gray-50 border-gray-200 text-xs">
                    <SelectValue placeholder="Coordenador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos coordenadores</SelectItem>
                    <SelectItem value="SEM">Sem coordenador</SelectItem>
                    {profiles
                      .filter((p) => p.role === 'coordenador')
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
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
                Prazo vencido
              </button>

              <button type="button" onClick={handleToggleContextMenu} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700"><span className={`relative h-4 w-7 rounded-full ${menuContextoAtivo ? 'bg-[#006653]' : 'bg-gray-300'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${menuContextoAtivo ? 'translate-x-3.5' : 'translate-x-0.5'}`}/></span>Menu rápido</button>
              </div>

              {(filterCategoria !== 'TODAS' || filterCoordenador !== 'TODOS' || filterAtrasado || searchTerm || filterStatus !== 'TODOS') && (
                <button
                  onClick={() => {
                    setFilterStatus('TODOS');
                    setFilterCategoria('TODAS');
                    setFilterCoordenador('TODOS');
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
                    { id: 'TODOS', label: 'Todas', count: stats.total, dot: '' },
                    ...(ehCentral(papel)
                      ? [{ id: 'RESPONDER', label: 'Responder ao cidadão', count: chamados.filter(faltaResponder).length, dot: 'bg-amber-600' }]
                      : []),
                    {
                      id: 'COBRADAS',
                      label: '🔔 Cobradas',
                      count: chamados.filter((c) => osEmAberto(c.status) && (c.cobrancas || 0) > 0).length,
                      dot: '',
                    },
                    ...STATUS_OS.map((st) => ({
                      id: st,
                      label: STATUS_OS_INFO[st].label,
                      count: chamados.filter((c) => normalizeStatus(c.status) === st).length,
                      dot: STATUS_OS_INFO[st].dot,
                    })),
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
                    <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
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

              <div className="px-3 sm:px-4 py-2.5 border-b border-gray-100 bg-white flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-600">
                <span className="font-bold text-gray-700">Legenda:</span>
                {STATUS_OS.map((st) => (
                  <span key={st} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_OS_INFO[st].dot}`} />
                    {STATUS_OS_INFO[st].label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"/>Prazo vencido</span>
              </div>

              {filteredChamados.length === 0 ? (
                <div className="py-14 text-center px-4">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Nenhuma Ordem de Serviço encontrada</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Ajuste os filtros de busca, categoria ou status acima para localizar outras solicitações.
                  </p>
                  {(filterCategoria !== 'TODAS' || filterCoordenador !== 'TODOS' || filterAtrasado || searchTerm || filterStatus !== 'TODOS') && (
                    <Button
                      onClick={() => {
                        setFilterStatus('TODOS');
                        setFilterCategoria('TODAS');
                        setFilterCoordenador('TODOS');
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
                <>
                  {osViewMode === 'table' && (
                    <div className="overflow-x-auto scrollbar-thin">
                      <div id="admin-page-chamados-list" className="min-w-[1240px] text-left text-xs">
                        <div className={`sticky top-0 z-10 grid ${GRADE_TABELA_OS} bg-gray-50/95 backdrop-blur border-b border-gray-200 uppercase font-semibold text-[10px] tracking-wider text-gray-600`}>
                          <div className="px-3 py-3">Protocolo</div>
                          <div className="px-3 py-3">Cidadão</div>
                          <div className="px-3 py-3">Serviço</div>
                          <div className="px-3 py-3">Endereço</div>
                          <div className="px-3 py-3">Coordenador</div>
                          <div className="px-3 py-3">Prazo</div>
                          <div className="px-3 py-3">Status</div>
                          <div className="px-3 py-3 text-right">Ações</div>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {filteredChamados.map((c) => {
                            const catInfo = getCategoriaInfo(c.categoria);
                            const address = c.endereco_texto || (c as any).endereco || 'Trindade - GO';
                            const vencido = prazoVencido(c);
                            const coord = nomeCoordenador(c.coordenador_id);
                            return (
                              <div
                                key={c.id || c.protocolo}
                                className={`grid ${GRADE_TABELA_OS} items-center hover:bg-emerald-50/30 transition-colors cursor-pointer ${vencido ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}
                                onClick={() => openDetail(c)}
                              >
                                <div className="px-3 py-3 min-w-0">
                                  <span className="font-mono font-bold text-[11px] text-[#006653] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 whitespace-nowrap">
                                    {c.protocolo}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1" title={formatData(c.created_at)}>
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    {tempoRelativo(c.created_at)}
                                  </div>
                                </div>
                                <div className="px-3 py-3 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{c.cidadao_nome || (c as any).nome_cidadao || 'Cidadão Trindadense'}</div>
                                  <div className="text-[10px] text-gray-500 truncate">{c.cidadao_telefone || (c as any).telefone_cidadao || ''}</div>
                                </div>
                                <div className="px-3 py-3 min-w-0">
                                  <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-[11px] truncate">
                                    <CategoriaIcone categoria={catInfo.id} className="w-3.5 h-3.5" />
                                    <span className="truncate">{catInfo?.label || c.categoria}</span>
                                  </div>
                                  <p className="text-gray-600 text-[11px] truncate">{c.descricao || 'Sem descrição informada'}</p>
                                </div>
                                <div className="px-3 py-3 min-w-0">
                                  <div className="flex items-start gap-1 text-gray-700">
                                    <MapPin className="w-3.5 h-3.5 text-[#006653] shrink-0 mt-0.5" />
                                    <span className="text-[11px] font-medium line-clamp-2" title={address}>{address}</span>
                                  </div>
                                </div>
                                <div className="px-3 py-3 min-w-0">
                                  {coord ? (
                                    <>
                                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-800 truncate" title={coord}>
                                        <HardHat className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                        <span className="truncate">{coord}</span>
                                      </span>
                                      {osEmAberto(c.status) && (
                                        <span
                                          className={`flex items-center gap-1 text-[10px] mt-0.5 ${c.visualizado_em ? 'text-emerald-700' : 'text-amber-700'}`}
                                          title={c.visualizado_em ? `Visualizou em ${formatData(c.visualizado_em)}` : 'O coordenador ainda não abriu esta O.S.'}
                                        >
                                          <Eye className="w-3 h-3" />
                                          {c.visualizado_em ? 'visualizou' : 'não visualizou'}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic">Não encaminhada</span>
                                  )}
                                </div>
                                <div className="px-3 py-3 whitespace-nowrap">
                                  {c.sla_limite ? (
                                    <span className={`text-[11px] font-medium ${vencido ? 'text-red-700' : 'text-gray-700'}`} title={formatData(c.sla_limite)}>
                                      {vencido && <AlertTriangle className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
                                      {formatData(c.sla_limite).slice(0, 10)}
                                      <span className="block text-[10px] font-normal text-gray-500">
                                        {vencido ? 'vencido' : osEmAberto(c.status) ? prazoRestante(c.sla_limite) : 'encerrada'}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">—</span>
                                  )}
                                </div>
                                <div className="px-3 py-3">
                                  <StatusBadge status={c.status} />
                                  <SinaisCentral chamado={c} />
                                </div>
                                <div className="px-3 py-3 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <AcaoPrincipalOS chamado={c} papel={papel} ocupado={updatingId === (c.id || c.protocolo)} acoes={acoesDaOS(c)} />
                                  <OSContextMenu chamado={c} papel={papel} enabled={menuContextoAtivo} acoes={acoesDaOS(c)} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                {osViewMode === 'cards' && (
                  <div className="p-3 sm:p-4">
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                      {filteredChamados.map((c) => {
                        const catInfo = getCategoriaInfo(c.categoria);
                        const address = c.endereco_texto || (c as any).endereco || 'Trindade - GO';
                        const vencido = prazoVencido(c);
                        const coord = nomeCoordenador(c.coordenador_id);
                        return (
                          <Card
                            key={c.id || c.protocolo}
                            className={`border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${vencido ? 'border-l-4 border-l-red-500' : ''}`}
                            onClick={() => openDetail(c)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <Badge className="font-mono bg-emerald-50 text-[#006653] border border-emerald-200">{c.protocolo}</Badge>
                                <div className="flex flex-col items-end">
                                  <StatusBadge status={c.status} />
                                  <SinaisCentral chamado={c} />
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2 font-semibold text-gray-800">
                                <CategoriaIcone categoria={catInfo.id} className="w-4 h-4" />
                                {catInfo?.label || c.categoria}
                              </div>
                              <p className="mt-2 text-xs text-gray-600 line-clamp-2">{c.descricao || 'Sem descrição informada'}</p>
                              <div className="mt-3 space-y-1.5 text-xs">
                                <div className="flex gap-2 text-gray-700">
                                  <MapPin className="w-3.5 h-3.5 text-[#006653] shrink-0" />
                                  <span className="truncate">{address}</span>
                                </div>
                                <div className="flex gap-2 text-gray-700">
                                  <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{c.cidadao_nome || (c as any).nome_cidadao || 'Cidadão Trindadense'}</span>
                                </div>
                                <div className="flex gap-2 text-gray-700">
                                  <HardHat className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                  <span className={`truncate ${coord ? '' : 'italic text-gray-400'}`}>{coord || 'Não encaminhada'}</span>
                                </div>
                                {c.sla_limite && (
                                  <div className={`flex gap-2 ${vencido ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      Prazo {formatData(c.sla_limite)}
                                      {osEmAberto(c.status) && ` · ${vencido ? 'vencido' : prazoRestante(c.sla_limite)}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 pt-3 border-t flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <AcaoPrincipalOS chamado={c} papel={papel} ocupado={updatingId === (c.id || c.protocolo)} acoes={acoesDaOS(c)} />
                                <OSContextMenu chamado={c} papel={papel} enabled={menuContextoAtivo} acoes={acoesDaOS(c)} />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
                </>
              )}
            </Card>
          </div>
        )}

        {/* Quadro Kanban (Alternativa visual organizada por etapas) */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {KANBAN_COLUMNS.map((col) => {
              const colChamados = filteredChamados.filter((c) => normalizeStatus(c.status) === col);
              return (
                <div key={col} className="space-y-3">
                  <div className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_OS_INFO[col].dot}`} />
                      <span className="font-semibold text-xs text-gray-800">{STATUS_OS_INFO[col].label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {colChamados.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 min-h-[200px]">
                    {colChamados.map((c) => {
                      const catInfo = getCategoriaInfo(c.categoria);
                      const slaExpired = prazoVencido(c);

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
                                <CategoriaIcone categoria={catInfo.id} className="w-3.5 h-3.5" />
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
                    <span className="font-semibold text-emerald-100">Mapa de Trindade - GO</span>
                    <span className="text-emerald-300/70 hidden md:inline">| Chamados georreferenciados</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-200 text-[11px]">
                    <span className="bg-amber-600/90 px-2.5 py-0.5 rounded text-white font-mono font-bold">
                      {filteredChamados.length} chamado(s)
                    </span>
                  </div>
                </div>
                <div style={{ height: '620px' }}>
                  <AdminMap
                    chamados={filteredChamados}
                    onSelect={openDetail}
                  />
                </div>
              </Card>
            )}
          </>
        )}

        {/* Aba de Mapa Territorial Completo e Dedicado */}
        {adminTab === 'mapa' && (
          <Card className="border-gray-200 overflow-hidden shadow-sm mb-6 bg-white">
            <div className="border-b border-gray-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <h3 className="font-semibold text-gray-900 text-base font-heading">
                  Mapa de chamados
                </h3>
                <p className="text-gray-500 text-sm">
                  Clique em um pino para ver o chamado.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  size="sm"
                  onClick={() => setIsNewChamadoOpen(true)}
                  className="bg-[#006653] hover:bg-[#005242] text-white font-semibold text-xs h-8 gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nova O.S.</span>
                </Button>
              </div>
            </div>
            <div style={{ height: '650px' }}>
              <AdminMap
                chamados={filteredChamados}
                onSelect={openDetail}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Modal de Edição Completa de Ordem de Serviço */}
      <AdminModalEditChamado
        chamado={selectedChamado}
        open={isEditModalOpen}
        coordenadores={coordenadores}
        papel={papel}
        podeExcluir={isAdmin || profile?.role === 'admin' || !isSupabaseConfigured}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedChamado(null);
        }}
        onSave={handleSaveChamado}
        onDelete={handleDeleteChamado}
      />

      {/* Encaminhar a O.S. ao coordenador */}
      <AdminModalEncaminhar
        chamado={encaminhar?.chamado ?? null}
        destino={encaminhar?.destino ?? 'coordenador'}
        coordenadores={coordenadores}
        open={Boolean(encaminhar)}
        onClose={() => setEncaminhar(null)}
        onConfirmar={encaminhar?.destino === 'secretaria' ? handleEnviarSecretaria : handleEncaminhar}
      />

      {/* Passos que pedem motivo (cancelar, devolver, recusar) */}
      <AdminDialogoMotivo pedido={pedidoMotivo} onFechar={() => setPedidoMotivo(null)} />

      {/* Central: resposta ao cidadão */}
      <AdminDialogoResposta chamado={respondendo} onFechar={() => setRespondendo(null)} onSalvar={handleSalvarResposta} />

      {/* Modal de Criação de Nova Ordem de Serviço Manual (Administrador) */}
      <AdminModalNovoChamado
        open={isNewChamadoOpen && !isSupabaseConfigured}
        onClose={() => setIsNewChamadoOpen(false)}
        onCreate={handleCreateChamado}
      />

      {/* Celular: navegação do painel na barra inferior */}
      {isFiscalOrAdmin && (
        <AdminMobileNav aba={adminTab} onSelecionar={selecionarAba} totalChamados={chamados.length} abasPermitidas={abasPermitidas} />
      )}
    </div>
  );
}
