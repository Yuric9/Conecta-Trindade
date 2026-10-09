'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  STATUS_OS,
  STATUS_OS_INFO,
  STATUS_COM_COORDENADOR,
  normalizarStatusOS,
  type StatusOS,
} from '@/lib/os-status';
import { CategoriaIcone } from '@/components/categoria-icone';
import type { Chamado, ChamadoStatus, ChamadoCategoria, ChamadoSecretaria, Profile } from '@/lib/types';
import { SECRETARIAS, CATEGORIAS, formatData, normalizeCategoria } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  ShieldAlert,
  HardHat,
  History,
  Loader2,
} from 'lucide-react';
import {
  formatChamadoWhatsAppText,
  formatarOSParaCoordenador,
  abrirWhatsAppPara,
  copyToClipboard,
} from '@/lib/whatsapp-share';

interface AdminModalEditChamadoProps {
  chamado: Chamado | null;
  open: boolean;
  /** Coordenadores ativos que podem receber a O.S. */
  coordenadores: Profile[];
  /** Só o administrador exclui O.S. (os demais cancelam com motivo). */
  podeExcluir: boolean;
  onClose: () => void;
  /** Grava. Devolve null se deu certo ou a mensagem de erro. */
  onSave: (chamado: Chamado, motivo?: string) => Promise<string | null>;
  onDelete: (id: string) => void;
}

interface ItemHistorico {
  id: string | number;
  created_at: string;
  status_anterior?: string | null;
  status_novo?: string | null;
  coordenador_nome?: string | null;
  detalhe?: string | null;
  autor_nome?: string | null;
}

/** Sem banco (modo demonstração): monta a linha do tempo pelas datas da O.S. */
function historicoPelasDatas(c: Chamado): ItemHistorico[] {
  const itens: ItemHistorico[] = [
    { id: 'aberto', created_at: c.created_at, status_novo: 'Pendente', detalhe: 'Chamado aberto', autor_nome: c.cidadao_nome },
  ];
  const etapas: [string | null | undefined, StatusOS][] = [
    [c.encaminhado_em, 'Encaminhada'],
    [c.iniciado_em, 'Em Andamento'],
    [c.executado_em, 'Aguardando Confirmação'],
    [c.concluido_em, 'Concluído'],
  ];
  etapas.forEach(([data, st]) => data && itens.push({ id: st, created_at: data, status_novo: st }));
  return itens.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export default function AdminModalEditChamado({
  chamado,
  open,
  coordenadores,
  podeExcluir,
  onClose,
  onSave,
  onDelete,
}: AdminModalEditChamadoProps) {
  const [categoria, setCategoria] = useState<ChamadoCategoria>('ILUMINACAO');
  const [secretaria, setSecretaria] = useState<ChamadoSecretaria | 'NONE'>('NONE');
  const [status, setStatus] = useState<StatusOS>('Pendente');
  const [coordenadorId, setCoordenadorId] = useState<string>('NONE');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useState<ItemHistorico[] | null>(null);
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [enderecoTexto, setEnderecoTexto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cidadaoNome, setCidadaoNome] = useState('');
  const [cidadaoTelefone, setCidadaoTelefone] = useState('');
  const [slaLimite, setSlaLimite] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [respostaCidadao, setRespostaCidadao] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (chamado) {
      setCategoria(normalizeCategoria(chamado.categoria));
      setSecretaria(chamado.secretaria || 'NONE');
      setStatus(normalizarStatusOS(chamado.status));
      setCoordenadorId(chamado.coordenador_id || 'NONE');
      setMotivo('');
      setErro(null);
      setSalvando(false);
      setPrioridade(chamado.prioridade || 'MEDIA');
      setEnderecoTexto(chamado.endereco_texto || '');
      setDescricao(chamado.descricao || '');
      setCidadaoNome(chamado.cidadao_nome || '');
      setCidadaoTelefone(chamado.cidadao_telefone || '');
      setSlaLimite(chamado.sla_limite ? chamado.sla_limite.slice(0, 16) : '');
      setObservacoesInternas(chamado.observacoes_internas || '');
      setRespostaCidadao(chamado.resposta_cidadao || '');
      setConfirmDelete(false);
    }
  }, [chamado]);

  // Histórico: quem fez o quê e quando
  useEffect(() => {
    if (!chamado || !open) return;
    if (!isSupabaseConfigured) {
      setHistorico(historicoPelasDatas(chamado));
      return;
    }
    let cancelado = false;
    setHistorico(null);
    (supabase.from('chamado_historico') as any)
      .select('id, created_at, status_anterior, status_novo, coordenador_nome, detalhe, autor_nome')
      .eq('chamado_id', chamado.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }: { data: ItemHistorico[] | null; error: any }) => {
        if (cancelado) return;
        if (error) console.error('Erro ao carregar histórico da O.S.:', error);
        setHistorico(error ? historicoPelasDatas(chamado) : data || []);
      });
    return () => {
      cancelado = true;
    };
  }, [chamado, open]);

  if (!chamado) return null;

  const statusOriginal = normalizarStatusOS(chamado.status);
  const coordenadorOriginal = chamado.coordenador_id || 'NONE';
  const mudouEtapa = status !== statusOriginal || coordenadorId !== coordenadorOriginal;
  const coordenadorEscolhido = coordenadores.find((p) => p.id === coordenadorId);
  // Coordenador que já está na O.S. mas não está mais ativo continua aparecendo
  const opcoesCoordenador =
    chamado.coordenador_id && !coordenadores.some((p) => p.id === chamado.coordenador_id)
      ? [{ id: chamado.coordenador_id, nome: 'Coordenador atual (inativo)' } as Profile, ...coordenadores]
      : coordenadores;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (STATUS_COM_COORDENADOR.includes(status) && coordenadorId === 'NONE') {
      setErro(`Para "${STATUS_OS_INFO[status].label}" a O.S. precisa de um coordenador.`);
      return;
    }
    if (status === 'Cancelado' && statusOriginal !== 'Cancelado' && !motivo.trim()) {
      setErro('Informe o motivo do cancelamento.');
      return;
    }

    const updatedChamado: Chamado = {
      ...chamado,
      categoria,
      secretaria: secretaria === 'NONE' ? null : secretaria,
      status: status as ChamadoStatus,
      coordenador_id: coordenadorId === 'NONE' ? null : coordenadorId,
      prioridade,
      endereco_texto: enderecoTexto.trim(),
      descricao: descricao.trim(),
      cidadao_nome: cidadaoNome.trim() || undefined,
      cidadao_telefone: cidadaoTelefone.trim() || undefined,
      sla_limite: slaLimite ? new Date(slaLimite).toISOString() : undefined,
      observacoes_internas: observacoesInternas.trim() || undefined,
      resposta_cidadao: respostaCidadao.trim() || undefined,
      updated_at: new Date().toISOString(),
    };

    setSalvando(true);
    const falha = await onSave(updatedChamado, motivo.trim() || undefined);
    setSalvando(false);
    if (falha) setErro(falha);
    else onClose();
  };

  const statusInfo = STATUS_OS_INFO[status];

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl bg-white max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006653] flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900">
                  Gerenciar Ordem de Serviço
                </DialogTitle>
                <p className="text-xs text-gray-500 font-mono">Protocolo: {chamado.protocolo}</p>
              </div>
            </div>
            <Badge variant="outline" className={`${statusInfo.badge} text-xs font-semibold px-2.5 py-0.5`}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Informações Básicas do Chamado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Etapa da O.S. *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusOS)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OS.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_OS_INFO[st].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Secretaria Responsável</Label>
              <Select value={secretaria} onValueChange={(v) => setSecretaria(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Não atribuída</SelectItem>
                  {(Object.entries(SECRETARIAS) as [ChamadoSecretaria, string][]).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Prioridade / Urgência</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa Prioridade</SelectItem>
                  <SelectItem value="MEDIA">Média Prioridade</SelectItem>
                  <SelectItem value="ALTA">Alta Prioridade</SelectItem>
                  <SelectItem value="URGENTE">Urgente / Risco Imediato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-orange-600" />
                Coordenador responsável
              </Label>
              <Select value={coordenadorId} onValueChange={setCoordenadorId}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhum (ainda não encaminhada)</SelectItem>
                  {opcoesCoordenador.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                      {p.servicos?.includes(categoria) ? ' ★' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400 mt-0.5">★ atende este tipo de serviço</p>
            </div>

            {mudouEtapa ? (
              <div>
                <Label className="text-xs font-semibold text-gray-700">
                  {status === 'Cancelado' ? 'Motivo do cancelamento *' : 'Observação desta alteração'}
                </Label>
                <Textarea
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={500}
                  placeholder={status === 'Cancelado' ? 'Ex.: chamado duplicado do TRIN-2026-XXXX' : 'Vai para o histórico da O.S.'}
                  className="text-xs mt-1 bg-white"
                />
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Categoria do Serviço *</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            <div>
              <Label className="text-xs font-semibold text-gray-700">Prazo SLA Limite</Label>
              <Input
                type="datetime-local"
                value={slaLimite}
                onChange={(e) => setSlaLimite(e.target.value)}
                className="h-9 text-xs mt-1 bg-white"
              />
            </div>
          </div>

          {/* Endereço e Localização */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#006653]" />
              <span>Endereço / Ponto de Referência</span>
            </Label>
            <Input
              type="text"
              value={enderecoTexto}
              onChange={(e) => setEnderecoTexto(e.target.value)}
              placeholder="Ex: Av. Raimundo de Aquino, Setor Oeste, Trindade - GO"
              className="h-9 text-xs mt-1 bg-white"
            />
          </div>

          {/* Descrição do Chamado */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Descrição Detalhada da Demanda</Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs mt-1 bg-white"
            />
          </div>

          {/* Dados do Munícipe Solicitante */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <Label className="text-xs font-bold text-gray-800 flex items-center gap-1 mb-2">
              <User className="w-3.5 h-3.5 text-[#006653]" />
              <span>Dados do Cidadão Solicitante</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-600">Nome Completo</Label>
                <Input
                  type="text"
                  value={cidadaoNome}
                  onChange={(e) => setCidadaoNome(e.target.value)}
                  placeholder="Nome do morador"
                  className="h-8 text-xs mt-0.5 bg-white"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-600">Telefone / WhatsApp</Label>
                <Input
                  type="text"
                  value={cidadaoTelefone}
                  onChange={(e) => setCidadaoTelefone(e.target.value)}
                  placeholder="(62) 99999-9999"
                  className="h-8 text-xs mt-0.5 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Despacho Técnico e Resposta ao Cidadão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Observações internas da equipe
              </Label>
              <Textarea
                rows={3}
                placeholder="Notas de vistoria, equipe designada, materiais necessários..."
                value={observacoesInternas}
                onChange={(e) => setObservacoesInternas(e.target.value)}
                className="text-xs mt-1 bg-white"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Resposta para o cidadão
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex: Equipe de pavimentação esteve no local e executou o reparo da via pública..."
                value={respostaCidadao}
                onChange={(e) => setRespostaCidadao(e.target.value)}
                className="text-xs mt-1 bg-white"
              />
            </div>
          </div>

          {/* Fotos do Chamado se houver */}
          {chamado.fotos && chamado.fotos.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">Fotos Anexadas pelo Cidadão</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {chamado.fotos.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 flex-shrink-0"
                  >
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Foto enviada pelo coordenador ao terminar o serviço */}
          {chamado.foto_execucao_url && /^(https:\/\/|data:image\/)/.test(chamado.foto_execucao_url) && (
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">Foto do serviço executado (coordenador)</Label>
              <a href={chamado.foto_execucao_url} target="_blank" rel="noreferrer" className="block w-40 h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90">
                <img src={chamado.foto_execucao_url} alt="Foto do serviço executado" className="w-full h-full object-cover" />
              </a>
            </div>
          )}

          {/* Histórico da O.S. */}
          <div className="rounded-lg border border-gray-200 p-3">
            <Label className="text-xs font-bold text-gray-800 flex items-center gap-1 mb-2">
              <History className="w-3.5 h-3.5 text-[#006653]" />
              Histórico da O.S.
            </Label>
            {historico === null ? (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </p>
            ) : historico.length === 0 ? (
              <p className="text-xs text-gray-500">Sem registros.</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-1.5 space-y-2.5">
                {historico.map((h) => {
                  const st = h.status_novo ? STATUS_OS_INFO[normalizarStatusOS(h.status_novo)] : null;
                  return (
                    <li key={h.id} className="ml-3 text-xs">
                      <span className={`absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${st?.dot || 'bg-gray-400'}`} />
                      <p className="text-[10px] text-gray-500">{formatData(h.created_at)}</p>
                      <p className="text-gray-800">
                        {st && h.detalhe !== 'Chamado aberto' && <strong>{st.label}</strong>}
                        {h.detalhe === 'Chamado aberto' && <strong>Chamado aberto</strong>}
                        {h.coordenador_nome && (
                          <span>
                            {st ? ' · ' : ''}coordenador: <strong>{h.coordenador_nome}</strong>
                          </span>
                        )}
                        {/* Registro sem troca de etapa (ex.: "Visualizou a O.S.") */}
                        {!st && !h.coordenador_nome && h.detalhe && <strong>{h.detalhe}</strong>}
                        {h.autor_nome && <span className="text-gray-500"> — por {h.autor_nome}</span>}
                      </p>
                      {h.detalhe && h.detalhe !== 'Chamado aberto' && (st || h.coordenador_nome) && (
                        <p className="text-gray-600 italic">&ldquo;{h.detalhe}&rdquo;</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* WhatsApp: coordenador e cidadão */}
          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-emerald-900">WhatsApp:</span> abre a conversa já com a mensagem pronta.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {coordenadorEscolhido && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    abrirWhatsAppPara(
                      coordenadorEscolhido.telefone,
                      formatarOSParaCoordenador({
                        protocolo: chamado.protocolo,
                        categoria,
                        coordenadorNome: coordenadorEscolhido.nome,
                        prioridade,
                        sla_limite: slaLimite ? new Date(slaLimite).toISOString() : null,
                        endereco: enderecoTexto,
                        descricao,
                        cidadao_nome: cidadaoNome,
                        cidadao_telefone: cidadaoTelefone,
                        latitude: chamado.latitude,
                        longitude: chamado.longitude,
                      })
                    )
                  }
                  className="bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Coordenador</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  abrirWhatsAppPara(
                    cidadaoTelefone,
                    formatChamadoWhatsAppText({
                      protocolo: chamado.protocolo,
                      categoria,
                      status,
                      secretariaNome: secretaria !== 'NONE' ? SECRETARIAS[secretaria] : undefined,
                      endereco: enderecoTexto,
                      descricao,
                      created_at: chamado.created_at,
                      resposta_cidadao: respostaCidadao,
                    })
                  )
                }
                className="text-xs h-8 px-3 border-[#25D366] text-[#128C7E] bg-white flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Cidadão</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const text = formatChamadoWhatsAppText({
                    protocolo: chamado.protocolo,
                    categoria,
                    status,
                    secretariaNome: secretaria !== 'NONE' ? SECRETARIAS[secretaria] : undefined,
                    endereco: enderecoTexto,
                    descricao,
                    created_at: chamado.created_at,
                    resposta_cidadao: respostaCidadao,
                  });
                  const ok = await copyToClipboard(text);
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="text-xs h-8 px-3 border-gray-200 bg-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                <span>{copied ? 'Copiado!' : 'Copiar texto'}</span>
              </Button>
            </div>
          </div>

          {erro && (
            <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {erro}
            </p>
          )}

          <DialogFooter className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {!podeExcluir ? (
              <span className="text-[11px] text-gray-400">Para encerrar sem executar, use a etapa &ldquo;Cancelada&rdquo;.</span>
            ) : !confirmDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-9"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Excluir Ordem de Serviço</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-semibold">Confirmar exclusão definitiva?</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onDelete(chamado.id);
                    onClose();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3"
                >
                  Sim, Excluir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs h-8 px-2"
                >
                  Cancelar
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs h-9"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 font-semibold px-4"
              >
                {salvando ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
