'use client';

import React, { useState, useMemo } from 'react';
import type { OrgaoPublico, TipoOrgaoPublico } from '@/lib/public-places';
import {
  CATEGORIAS_ORGAOS,
  getOrgaoVisualProps,
} from '@/lib/public-places';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Clock,
  Edit2,
  Trash2,
  RotateCcw,
  ExternalLink,
  MapPinned,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface AdminOrgaosTabProps {
  orgaos: OrgaoPublico[];
  onSaveOrgao: (orgao: OrgaoPublico) => void;
  onDeleteOrgao: (id: string) => void;
  onResetOrgaos: () => void;
  onViewOnMap: (orgao: OrgaoPublico) => void;
}

const BAIRROS_TRINDADE_SUGESTOES = [
  'Centro',
  'Vila Pai Eterno',
  'Setor Oeste',
  'Setor Sul',
  'Setor Maysa I',
  'Setor Maysa II',
  'Jardim Salvador',
  'Jardim Imperial',
  'Setor Pontakayana',
  'Setor Marise',
  'Residencial Monte Cristo',
  'Vila Santo Afonso',
  'Setor Cristina II',
  'Residencial Solar dos Mellos',
  'Setor Samarah',
  'Jardim Tamandaré',
  'Setor Laguna Park',
  'Santana',
];

const PRESET_COORDS = [
  { label: 'Centro de Trindade', lat: -16.6496, lng: -49.4912 },
  { label: 'Região Leste (Maysa)', lat: -16.6235, lng: -49.3980 },
  { label: 'Setor Oeste', lat: -16.6580, lng: -49.4975 },
  { label: 'Setor Sul', lat: -16.6620, lng: -49.4890 },
  { label: 'Jardim Imperial', lat: -16.6350, lng: -49.4120 },
];

export default function AdminOrgaosTab({
  orgaos,
  onSaveOrgao,
  onDeleteOrgao,
  onResetOrgaos,
  onViewOnMap,
}: AdminOrgaosTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('TODOS');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrgao, setEditingOrgao] = useState<OrgaoPublico | null>(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState<TipoOrgaoPublico>('SECRETARIA');
  const [formBairro, setFormBairro] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formHorario, setFormHorario] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formLat, setFormLat] = useState('-16.6496');
  const [formLng, setFormLng] = useState('-49.4912');

  // Delete and Reset states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Métricas
  const metrics = useMemo(() => {
    const total = orgaos.length;
    const sedes = orgaos.filter((o) => o.tipo === 'PREFEITURA' || o.tipo === 'SECRETARIA').length;
    const saude = orgaos.filter((o) => o.tipo === 'UBS' || o.tipo === 'HOSPITAL_UPA').length;
    const educacao = orgaos.filter((o) => o.tipo === 'ESCOLA' || o.tipo === 'CMEI').length;
    const parques = orgaos.filter((o) => o.tipo === 'PARQUE').length;
    const ecopontos = orgaos.filter((o) => o.tipo === 'ECOPONTO' || o.tipo === 'SERVICO').length;
    return { total, sedes, saude, educacao, parques, ecopontos };
  }, [orgaos]);

  // Lista Filtrada
  const filteredOrgaos = useMemo(() => {
    return orgaos.filter((o) => {
      if (tipoFilter !== 'TODOS') {
        if (tipoFilter === 'PREFEITURA_SEC') {
          if (o.tipo !== 'PREFEITURA' && o.tipo !== 'SECRETARIA') return false;
        } else if (tipoFilter === 'SAUDE') {
          if (o.tipo !== 'UBS' && o.tipo !== 'HOSPITAL_UPA') return false;
        } else if (tipoFilter === 'EDUCACAO') {
          if (o.tipo !== 'ESCOLA' && o.tipo !== 'CMEI') return false;
        } else if (tipoFilter === 'PARQUES') {
          if (o.tipo !== 'PARQUE') return false;
        } else if (tipoFilter === 'ECOPONTO') {
          if (o.tipo !== 'ECOPONTO') return false;
        } else if (tipoFilter === 'SERVICO') {
          if (o.tipo !== 'SERVICO') return false;
        } else if (o.tipo !== tipoFilter) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mNome = o.nome?.toLowerCase().includes(q);
        const mBairro = o.bairro?.toLowerCase().includes(q);
        const mEndereco = o.endereco?.toLowerCase().includes(q);
        if (!mNome && !mBairro && !mEndereco) return false;
      }
      return true;
    });
  }, [orgaos, tipoFilter, searchTerm]);

  const handleOpenCreate = () => {
    setEditingOrgao(null);
    setFormNome('');
    setFormTipo('SECRETARIA');
    setFormBairro('Centro');
    setFormEndereco('');
    setFormTelefone('(62) 3506-7000');
    setFormHorario('Seg a Sex: 08:00 às 17:00');
    setFormDescricao('');
    setFormLat('-16.6496');
    setFormLng('-49.4912');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (orgao: OrgaoPublico) => {
    setEditingOrgao(orgao);
    setFormNome(orgao.nome || '');
    setFormTipo(orgao.tipo || 'SECRETARIA');
    setFormBairro(orgao.bairro || '');
    setFormEndereco(orgao.endereco || '');
    setFormTelefone(orgao.telefone || '');
    setFormHorario(orgao.horario || '');
    setFormDescricao(orgao.descricao || '');
    setFormLat(String(orgao.latitude || -16.6496));
    setFormLng(String(orgao.longitude || -49.4912));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formBairro.trim()) return;

    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    const visual = getOrgaoVisualProps(formTipo);

    const orgaoToSave: OrgaoPublico = {
      id: editingOrgao?.id || `orgao-${Date.now()}`,
      nome: formNome.trim(),
      tipo: formTipo,
      tipoLabel: visual.tipoLabel,
      emoji: visual.emoji,
      cor: visual.cor,
      bgBadge: visual.bgBadge,
      bairro: formBairro.trim(),
      endereco: formEndereco.trim() || 'Trindade - GO',
      telefone: formTelefone.trim() || undefined,
      horario: formHorario.trim() || undefined,
      descricao: formDescricao.trim() || undefined,
      latitude: isNaN(lat) ? -16.6496 : lat,
      longitude: isNaN(lng) ? -49.4912 : lng,
    };

    onSaveOrgao(orgaoToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header e Botão de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#006653] font-bold text-lg">
            <Building2 className="w-6 h-6" />
            <h2>Gestão de Órgãos Públicos e Equipamentos no Mapa</h2>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Cadastre novas unidades, UBSs, escolas, ecopontos e gerencie a geolocalização dos prédios públicos de Trindade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmReset(true)}
            className="text-gray-600 hover:text-gray-900 text-xs h-10 px-3 flex items-center gap-1.5 border-gray-200"
            title="Restaurar base oficial de órgãos da Prefeitura"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Restaurar Padrão</span>
          </Button>
          <Button
            id="btn-novo-orgao-admin"
            onClick={handleOpenCreate}
            className="bg-[#006653] hover:bg-[#004d3e] text-white font-medium text-xs h-10 px-4 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Órgão</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas de Equipamentos */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-gray-500">Total de Prédios</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">No mapa municipal</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-emerald-800">Sedes & Secretarias</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.sedes}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Administração</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-red-800">UBS & Hospitais / UPA</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{metrics.saude}</p>
            <p className="text-[10px] text-red-600 mt-0.5">Rede de Saúde</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-blue-800">Escolas & CMEIs</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.educacao}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Rede Educacional</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-green-800">Parques & Praças</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{metrics.parques}</p>
            <p className="text-[10px] text-green-600 mt-0.5">Áreas Verdes</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-teal-800">Ecopontos / Serviços</p>
            <p className="text-2xl font-bold text-teal-700 mt-1">{metrics.ecopontos}</p>
            <p className="text-[10px] text-teal-600 mt-0.5">Limpeza e Apoio</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Buscar por nome, bairro ou logradouro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 text-gray-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v)}>
            <SelectTrigger className="h-9 text-xs w-full md:w-[220px] bg-white border-gray-200">
              <SelectValue placeholder="Categoria do Órgão" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_ORGAOS.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Órgãos Públicos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10.5px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Nome do Órgão & Tipo</th>
                <th className="px-4 py-3.5">Bairro & Endereço</th>
                <th className="px-4 py-3.5">Contato & Atendimento</th>
                <th className="px-4 py-3.5">Coordenadas no Mapa</th>
                <th className="px-4 py-3.5 text-right">Ações Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredOrgaos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-sm">Nenhum órgão ou prédio localizado com os filtros atuais.</p>
                  </td>
                </tr>
              ) : (
                filteredOrgaos.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Nome e Badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl p-1.5 bg-gray-100 rounded-lg flex-shrink-0">
                          {o.emoji}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900 leading-snug">{o.nome}</p>
                          <Badge
                            variant="outline"
                            className={`${o.bgBadge} text-[10px] px-2 py-0.5 mt-1 font-medium`}
                          >
                            {o.tipoLabel}
                          </Badge>
                          {o.descricao && (
                            <p className="text-[10.5px] text-gray-500 mt-1 line-clamp-1 italic">
                              {o.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Bairro & Endereço */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#006653] flex-shrink-0" />
                        <span>{o.bairro}</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{o.endereco}</p>
                    </td>

                    {/* Contato & Horário */}
                    <td className="px-4 py-3">
                      {o.telefone && (
                        <p className="text-[11px] text-gray-700 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{o.telefone}</span>
                        </p>
                      )}
                      {o.horario && (
                        <p className="text-[10.5px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{o.horario}</span>
                        </p>
                      )}
                    </td>

                    {/* Coordenadas */}
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                      <div className="bg-gray-50 p-1.5 rounded border border-gray-100 inline-block">
                        <div>Lat: {o.latitude.toFixed(4)}</div>
                        <div>Lng: {o.longitude.toFixed(4)}</div>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewOnMap(o)}
                          className="h-8 px-2 text-xs text-[#006653] hover:bg-emerald-50 flex items-center gap-1"
                          title="Localizar no Mapa Interativo"
                        >
                          <MapPinned className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ver Mapa</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(o)}
                          className="h-8 w-8 p-0 text-gray-600 hover:text-[#006653] hover:bg-emerald-50"
                          title="Editar Cadastro do Órgão"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(o.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remover Órgão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Órgão */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#006653]" />
              <span>{editingOrgao ? 'Editar Dados do Órgão Público' : 'Cadastrar Novo Órgão ou Ponto no Mapa'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Nome do Equipamento / Prédio Público *</Label>
              <Input
                required
                type="text"
                placeholder="Ex: UBS Maysa II ou Nova Creche CMEI Bela Vista"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Tipo / Categoria *</Label>
                <Select value={formTipo} onValueChange={(v) => setFormTipo(v as any)}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREFEITURA">Sede / Paço Municipal</SelectItem>
                    <SelectItem value="SECRETARIA">Secretaria Municipal</SelectItem>
                    <SelectItem value="UBS">Unidade Básica de Saúde (UBS)</SelectItem>
                    <SelectItem value="HOSPITAL_UPA">Hospital / UPA 24h</SelectItem>
                    <SelectItem value="ESCOLA">Escola Municipal</SelectItem>
                    <SelectItem value="CMEI">CMEI / Educação Infantil</SelectItem>
                    <SelectItem value="PARQUE">Parque / Praça Pública</SelectItem>
                    <SelectItem value="ECOPONTO">Ecoponto / Coleta Seletiva</SelectItem>
                    <SelectItem value="SERVICO">Outro Serviço Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Bairro de Trindade *</Label>
                <Input
                  required
                  type="text"
                  placeholder="Ex: Centro, Setor Maysa, etc."
                  value={formBairro}
                  onChange={(e) => setFormBairro(e.target.value)}
                  className="h-9 text-xs mt-1"
                  list="lista-bairros-trindade"
                />
                <datalist id="lista-bairros-trindade">
                  {BAIRROS_TRINDADE_SUGESTOES.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Endereço Completo (Logradouro, Nº, Quadra, Lote)</Label>
              <Input
                type="text"
                placeholder="Ex: Av. Raimundo de Aquino com Rua 14, Qd. 10, Lt. 05"
                value={formEndereco}
                onChange={(e) => setFormEndereco(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Telefone Institucional</Label>
                <Input
                  type="text"
                  placeholder="(62) 3506-7000"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Horário de Funcionamento</Label>
                <Input
                  type="text"
                  placeholder="Ex: Seg a Sex: 07:00 às 17:00"
                  value={formHorario}
                  onChange={(e) => setFormHorario(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Descrição / Serviços Disponíveis</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Atendimento médico, vacinação de rotina, farmácia básica e curativos."
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            {/* Georreferenciamento */}
            <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <MapPinned className="w-3.5 h-3.5 text-[#006653]" />
                  <span>Coordenadas Geográficas (GPS)</span>
                </Label>
                <span className="text-[10px] text-emerald-700">Trindade - GO</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10.5px] text-gray-600">Latitude</Label>
                  <Input
                    required
                    type="text"
                    placeholder="-16.6496"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="h-8 text-xs mt-0.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10.5px] text-gray-600">Longitude</Label>
                  <Input
                    required
                    type="text"
                    placeholder="-49.4912"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="h-8 text-xs mt-0.5 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 mb-1">Preenchimento rápido por região de Trindade:</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COORDS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setFormLat(preset.lat.toFixed(4));
                        setFormLng(preset.lng.toFixed(4));
                      }}
                      className="text-[10px] px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 font-semibold"
              >
                {editingOrgao ? 'Salvar Alterações' : 'Cadastrar Órgão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Órgão */}
      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirmar Remoção do Órgão</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600">
            Tem certeza de que deseja remover este órgão do mapa e da base de dados? Ele deixará de aparecer para a equipe e cidadãos imediatamente.
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
                  onDeleteOrgao(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
            >
              Sim, Remover do Mapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Reset de Órgãos */}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-600 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>Restaurar Base Oficial de Órgãos</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600">
            Esta ação recarrega a lista oficial pré-configurada de órgãos públicos de Trindade (Prefeitura, Secretarias, UBSs, Escolas e Parques). Deseja continuar?
          </p>
          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onResetOrgaos();
                setConfirmReset(false);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 font-semibold"
            >
              Restaurar Lista Padrão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
