'use client';

import React, { useState, useMemo } from 'react';
import type { Profile, UserRole, ChamadoSecretaria, ChamadoCategoria } from '@/lib/types';
import { SECRETARIAS, SECRETARIAS_ATIVAS, CATEGORIAS, getCategoriaInfo } from '@/lib/types';
import { papelOS, NOME_PAPEL } from '@/lib/os-status';
import { CategoriaIcone } from '@/components/categoria-icone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  UsersRound,
  UserPlus,
  Search,
  ShieldCheck,
  Briefcase,
  User,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Lock,
  KeyRound,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileBadge,
  HardHat,
} from 'lucide-react';

interface AdminUsersTabProps {
  profiles: Profile[];
  currentUserId?: string;
  /** Grava. Com `senha`, cria a conta de login. Devolve null se deu certo ou a mensagem de erro. */
  onSaveProfile: (profile: Profile, senha?: string) => Promise<string | null>;
  onDeleteProfile: (id: string) => void;
  /** Define senha nova para conta da equipe. Devolve null se deu certo ou a mensagem de erro. */
  onDefinirSenha: (profile: Profile, senha: string) => Promise<string | null>;
}

const ROLES_INFO: Record<
  UserRole,
  { label: string; badge: string; icon: any; desc: string }
> = {
  admin: {
    label: 'Administrador Geral',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: ShieldCheck,
    desc: 'Acesso irrestrito a todos os módulos, configurações e relatórios.',
  },
  gestor: {
    label: 'Secretário / Gestor',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Briefcase,
    desc: 'Secretaria de Infraestrutura: escolhe o coordenador, confirma e cobra.',
  },
  fiscal: {
    label: 'Fiscal de Campo',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: FileBadge,
    desc: 'Vistoria, atesta e atualiza status de chamados em campo.',
  },
  atendente: {
    label: 'Atendente',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: UserPlus,
    desc: 'Sem secretaria: central do site (analisa e envia à Secretaria). Com Infraestrutura: atendente da pasta.',
  },
  coordenador: {
    label: 'Coordenador de Serviço',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: HardHat,
    desc: 'Recebe as O.S. dos serviços que coordena e executa em campo.',
  },
  cidadao: {
    label: 'Cidadão',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: User,
    desc: 'Usuário munícipe solicitante de serviços públicos.',
  },
};

export default function AdminUsersTab({
  profiles,
  currentUserId,
  onSaveProfile,
  onDeleteProfile,
  onDefinirSenha,
}: AdminUsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'TODOS'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ativo' | 'inativo' | 'bloqueado'>('TODOS');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('cidadao');
  const [formSecretaria, setFormSecretaria] = useState<ChamadoSecretaria | 'TODAS' | 'NONE'>('NONE');
  const [formCargo, setFormCargo] = useState('');
  const [formServicos, setFormServicos] = useState<ChamadoCategoria[]>([]);
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo' | 'bloqueado'>('ativo');
  const [formSenha, setFormSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  // "Definir nova senha" (só contas da equipe)
  const [senhaDe, setSenhaDe] = useState<Profile | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [senhaDefinida, setSenhaDefinida] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  const abrirSenha = (p: Profile) => {
    setSenhaDe(p);
    setNovaSenha('');
    setErroSenha(null);
    setSenhaDefinida(false);
  };

  const confirmarSenha = async () => {
    if (!senhaDe) return;
    if (novaSenha.length < 8) {
      setErroSenha('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setTrocandoSenha(true);
    const falha = await onDefinirSenha(senhaDe, novaSenha);
    setTrocandoSenha(false);
    if (falha) setErroSenha(falha);
    else {
      setSenhaDefinida(true);
      setNovaSenha('');
    }
  };
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Métricas
  const metrics = useMemo(() => {
    const total = profiles.length;
    const admins = profiles.filter((p) => p.role === 'admin').length;
    const gestores = profiles.filter((p) => p.role === 'gestor' || p.role === 'fiscal' || p.role === 'coordenador').length;
    const atendentes = profiles.filter((p) => p.role === 'atendente').length;
    const cidadaos = profiles.filter((p) => p.role === 'cidadao').length;
    return { total, admins, gestores, atendentes, cidadaos };
  }, [profiles]);

  // Lista Filtrada
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (roleFilter !== 'TODOS' && p.role !== roleFilter) return false;
      if (statusFilter !== 'TODOS' && (p.status || 'ativo') !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mNome = p.nome?.toLowerCase().includes(q);
        const mEmail = p.email?.toLowerCase().includes(q);
        const mCpf = p.cpf?.includes(q);
        const mCargo = p.cargo?.toLowerCase().includes(q);
        if (!mNome && !mEmail && !mCpf && !mCargo) return false;
      }
      return true;
    });
  }, [profiles, roleFilter, statusFilter, searchTerm]);

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setFormNome('');
    setFormEmail('');
    setFormCpf('');
    setFormTelefone('');
    setFormRole('atendente');
    setFormSecretaria('NONE');
    setFormCargo('');
    setFormServicos([]);
    setFormStatus('ativo');
    setFormSenha('');
    setErroForm(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormNome(profile.nome || '');
    setFormEmail(profile.email || '');
    setFormCpf(profile.cpf || '');
    setFormTelefone(profile.telefone || '');
    setFormRole(profile.role || 'cidadao');
    setFormSecretaria(profile.secretaria || 'NONE');
    setFormCargo(profile.cargo || '');
    setFormServicos(profile.servicos || []);
    setFormStatus(profile.status || 'ativo');
    setFormSenha('');
    setErroForm(null);
    setIsModalOpen(true);
  };

  const isCoordenador = formRole === 'coordenador';
  // Coordenador precisa de ao menos um serviço (para receber O.S.) e de
  // telefone (para ser avisado no WhatsApp).
  const faltaServico = isCoordenador && formServicos.length === 0;
  const faltaTelefone = isCoordenador && !formTelefone.trim();

  const alternarServico = (id: ChamadoCategoria) => {
    setFormServicos((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);
    if (!formNome.trim() || !formEmail.trim()) return;
    if (faltaServico || faltaTelefone) return;
    if (!editingProfile && formSenha.length < 8) {
      setErroForm('Defina uma senha com pelo menos 8 caracteres.');
      return;
    }

    const profileToSave: Profile = {
      id: editingProfile?.id || `user-manual-${Date.now()}`,
      nome: formNome.trim(),
      email: formEmail.trim().toLowerCase(),
      cpf: formCpf.trim() || undefined,
      telefone: formTelefone.trim() || undefined,
      role: formRole,
      secretaria: formSecretaria === 'NONE' ? null : formSecretaria,
      cargo: formCargo.trim() || undefined,
      servicos: isCoordenador ? formServicos : [],
      status: formStatus,
      created_at: editingProfile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSalvando(true);
    const falha = await onSaveProfile(profileToSave, editingProfile ? undefined : formSenha);
    setSalvando(false);
    if (falha) setErroForm(falha);
    else setIsModalOpen(false);
  };

  const handleToggleStatus = async (p: Profile) => {
    const nextStatus = p.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    onSaveProfile({
      ...p,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header e Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#006653] font-bold text-lg">
            <UsersRound className="w-6 h-6" />
            <h2>Gestão de Usuários & Servidores Públicos</h2>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Cadastre novos servidores, atribua papéis operacionais e gerencie permissões municipais.
          </p>
        </div>
        <Button
          id="btn-novo-usuario-admin"
          onClick={handleOpenCreate}
          className="bg-[#006653] hover:bg-[#004d3e] text-white font-medium text-xs h-10 px-4 flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-gray-500">Total de Usuários</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Cadastrados na base</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-emerald-800">Administradores</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.admins}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Acesso total</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-blue-800">Gestores & Coordenadores</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.gestores}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Atuação em campo</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-purple-800">Atendentes / Triagem</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{metrics.atendentes}</p>
            <p className="text-[10px] text-purple-600 mt-0.5">Protocolo e balcão</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-700">Cidadãos</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{metrics.cidadaos}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Munícipes solicitantes</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Buscar por nome, e-mail, CPF ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 text-gray-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro de Perfil */}
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="h-9 text-xs w-[170px] bg-white border-gray-200">
              <SelectValue placeholder="Perfil / Papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Perfis</SelectItem>
              <SelectItem value="admin">Administrador Geral</SelectItem>
              <SelectItem value="gestor">Gestor de Secretaria</SelectItem>
              <SelectItem value="fiscal">Fiscal de Campo</SelectItem>
              <SelectItem value="atendente">Atendente de Protocolo</SelectItem>
              <SelectItem value="coordenador">Coordenador de Serviço</SelectItem>
              <SelectItem value="cidadao">Cidadão</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-9 text-xs w-[130px] bg-white border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10.5px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Usuário & E-mail</th>
                <th className="px-4 py-3.5">CPF / Telefone</th>
                <th className="px-4 py-3.5">Perfil & Acesso</th>
                <th className="px-4 py-3.5">Secretaria / Lotação</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <UsersRound className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-sm">Nenhum usuário localizado com os filtros atuais.</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const roleConfig = ROLES_INFO[p.role] || ROLES_INFO.cidadao;
                  const RoleIcon = roleConfig.icon;
                  const isBlocked = p.status === 'bloqueado';
                  const isCurrent = p.id === currentUserId;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Avatar e Nome */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#006653] font-bold flex items-center justify-center text-xs border border-emerald-200 flex-shrink-0">
                            {p.nome?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                              <span>{p.nome}</span>
                              {isCurrent && (
                                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                  Você
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{p.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CPF / Telefone */}
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-mono text-[11px]">{p.cpf || 'Não informado'}</p>
                        {p.telefone && (
                          <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{p.telefone}</span>
                          </p>
                        )}
                      </td>

                      {/* Perfil & Acesso */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`${roleConfig.badge} text-[10.5px] px-2 py-0.5 font-medium flex items-center gap-1 w-fit`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          <span>{roleConfig.label}</span>
                        </Badge>
                        {p.cargo && (
                          <p className="text-[10px] text-gray-500 mt-1 font-medium italic truncate max-w-[160px]">
                            {p.cargo}
                          </p>
                        )}
                        {p.role === 'coordenador' && (
                          <div className="flex flex-wrap gap-1 mt-1 max-w-[220px]">
                            {(p.servicos || []).length === 0 ? (
                              <span className="text-[10px] text-red-600">Sem serviços definidos</span>
                            ) : (
                              (p.servicos || []).map((sv) => (
                                <span key={sv} className="text-[10px] bg-orange-50 text-orange-800 border border-orange-200 rounded px-1.5 py-0.5">
                                  {getCategoriaInfo(sv).label}
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </td>

                      {/* Secretaria */}
                      <td className="px-4 py-3">
                        {/* Onde a pessoa atua no fluxo da O.S. */}
                        {(papelOS(p) === 'central' || papelOS(p) === 'secretaria') && (
                          <span
                            className={`block w-fit mb-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded border ${
                              papelOS(p) === 'central'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {NOME_PAPEL[papelOS(p)!]}
                          </span>
                        )}
                        {p.secretaria === 'TODAS' ? (
                          <span className="text-emerald-700 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Todas as Secretarias
                          </span>
                        ) : p.secretaria && SECRETARIAS[p.secretaria] ? (
                          <span className="text-gray-700 font-medium text-xs">
                            {SECRETARIAS[p.secretaria]}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Nenhuma atribuição</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Ativo
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.role !== 'cidadao' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirSenha(p)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-[#006653] hover:bg-emerald-50"
                              title="Definir nova senha (conta da equipe)"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#006653] hover:bg-emerald-50"
                            title="Editar Dados do Usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(p)}
                            className={`h-8 w-8 p-0 ${
                              isBlocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={isBlocked ? 'Desbloquear Acesso' : 'Bloquear Usuário'}
                          >
                            {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </Button>

                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(p.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Usuário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#006653]" />
              <span>{editingProfile ? 'Editar Dados do Usuário' : 'Cadastrar Novo Usuário / Servidor'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Nome Completo *</Label>
              <Input
                required
                type="text"
                placeholder="Ex: Maria José de Oliveira"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">E-mail Institucional / Pessoal *</Label>
                <Input
                  required
                  type="email"
                  placeholder="usuario@trindade.go.gov.br"
                  // O e-mail é o login: não muda depois de criada a conta
                  disabled={Boolean(editingProfile)}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Telefone / WhatsApp</Label>
                <Input
                  type="text"
                  placeholder="(62) 99999-9999"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">CPF</Label>
                <Input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formCpf}
                  onChange={(e) => setFormCpf(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Status da Conta</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo (Permitido)</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Perfil de Acesso *</Label>
                <Select
                  value={formRole}
                  onValueChange={(v) => {
                    setFormRole(v as UserRole);
                    // Hoje todos os serviços são da Infraestrutura
                    if ((v === 'coordenador' || v === 'gestor') && formSecretaria === 'NONE') setFormSecretaria('INFRAESTRUTURA');
                  }}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador Geral</SelectItem>
                    <SelectItem value="gestor">Gestor de Secretaria</SelectItem>
                    <SelectItem value="fiscal">Fiscal de Campo</SelectItem>
                    <SelectItem value="atendente">Atendente de Protocolo</SelectItem>
                    <SelectItem value="coordenador">Coordenador de Serviço</SelectItem>
                    <SelectItem value="cidadao">Cidadão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Lotação</Label>
                <Select value={formSecretaria} onValueChange={(v) => setFormSecretaria(v as any)}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      {formRole === 'atendente' || formRole === 'fiscal' ? 'Central de atendimento (site)' : 'Nenhuma'}
                    </SelectItem>
                    <SelectItem value="TODAS">Todas as Secretarias (Admin)</SelectItem>
                    {(Object.entries(SECRETARIAS_ATIVAS) as [ChamadoSecretaria, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isCoordenador && (
              <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
                <Label className="text-xs font-semibold text-gray-800">Serviços que coordena *</Label>
                <p className="text-[11px] text-gray-500 mt-0.5 mb-2">
                  Ao encaminhar uma O.S. desses serviços, ele aparece como sugestão.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIAS.map((cat) => {
                    const marcado = formServicos.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                          marcado ? 'border-[#006653] bg-white text-gray-900' : 'border-gray-200 bg-white/70 text-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarServico(cat.id)}
                          className="accent-[#006653]"
                        />
                        <CategoriaIcone categoria={cat.id} className="w-3.5 h-3.5" />
                        <span className="truncate">{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
                {(faltaServico || faltaTelefone) && (
                  <p className="text-[11px] text-red-600 mt-2">
                    {faltaServico && 'Marque ao menos um serviço. '}
                    {faltaTelefone && 'Informe o telefone/WhatsApp: é por ele que o coordenador é avisado.'}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-gray-700">Cargo / Função Municipal</Label>
              <Input
                type="text"
                placeholder="Ex: Auditor de Posturas, Engenheiro Fiscal, etc."
                value={formCargo}
                onChange={(e) => setFormCargo(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            {!editingProfile && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">Senha de acesso *</Label>
                <Input
                  type="text"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Passe a senha para a pessoa por um canal seguro. Ela entra com este e-mail e senha.
                </p>
              </div>
            )}

            {erroForm && (
              <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {erroForm}
              </p>
            )}

            <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={faltaServico || faltaTelefone || salvando}
                className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 font-semibold"
              >
                {salvando ? 'Salvando...' : editingProfile ? 'Salvar Alterações' : 'Criar conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Definir nova senha (contas da equipe) */}
      <Dialog open={Boolean(senhaDe)} onOpenChange={(open) => !open && !trocandoSenha && setSenhaDe(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#006653]" />
              <span>Definir nova senha</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600">
            Para <strong>{senhaDe?.nome}</strong> ({senhaDe?.email}). Use quando o servidor não consegue receber o
            link de &quot;Esqueci minha senha&quot;. Passe a senha por um canal seguro e peça para a pessoa trocar em
            Perfil → Trocar minha senha.
          </p>
          {senhaDefinida ? (
            <p className="flex items-start gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
              Senha definida. A senha antiga deixou de funcionar.
            </p>
          ) : (
            <div>
              <Label className="text-xs font-semibold text-gray-700">Senha nova *</Label>
              <Input
                type="text"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
          )}
          {erroSenha && (
            <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {erroSenha}
            </p>
          )}
          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSenhaDe(null)} disabled={trocandoSenha} className="h-8 text-xs">
              {senhaDefinida ? 'Fechar' : 'Cancelar'}
            </Button>
            {!senhaDefinida && (
              <Button
                type="button"
                size="sm"
                onClick={confirmarSenha}
                disabled={trocandoSenha}
                className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-8"
              >
                {trocandoSenha ? 'Salvando...' : 'Definir senha'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Usuário */}
      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirmar Exclusão</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600">
            Tem certeza de que deseja remover este usuário do sistema? O histórico de ordens de serviço continuará vinculado ao CPF ou protocolo.
          </p>
          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (deletingId) {
                  onDeleteProfile(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
            >
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
