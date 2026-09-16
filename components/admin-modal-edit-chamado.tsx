'use client';

import React, { useState, useEffect } from 'react';
import type { Chamado, ChamadoStatus, ChamadoCategoria, ChamadoSecretaria } from '@/lib/types';
import {
  SECRETARIAS,
  CATEGORIAS,
  getCategoriaInfo,
  getStatusInfo,
  formatData,
} from '@/lib/types';
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
} from 'lucide-react';
import {
  formatChamadoWhatsAppText,
  shareViaWhatsApp,
  copyToClipboard,
} from '@/lib/whatsapp-share';

interface AdminModalEditChamadoProps {
  chamado: Chamado | null;
  open: boolean;
  onClose: () => void;
  onSave: (chamado: Chamado) => void;
  onDelete: (id: string) => void;
}

export default function AdminModalEditChamado({
  chamado,
  open,
  onClose,
  onSave,
  onDelete,
}: AdminModalEditChamadoProps) {
  const [categoria, setCategoria] = useState<ChamadoCategoria>('ILUMINACAO');
  const [secretaria, setSecretaria] = useState<ChamadoSecretaria | 'NONE'>('NONE');
  const [status, setStatus] = useState<ChamadoStatus>('ABERTO');
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
      setCategoria(chamado.categoria);
      setSecretaria(chamado.secretaria || 'NONE');
      setStatus(chamado.status);
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

  if (!chamado) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedChamado: Chamado = {
      ...chamado,
      categoria,
      secretaria: secretaria === 'NONE' ? null : secretaria,
      status,
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

    onSave(updatedChamado);
    onClose();
  };

  const statusInfo = getStatusInfo(status);

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
            <Badge variant="outline" className={`${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} text-xs font-semibold px-2.5 py-0.5`}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Informações Básicas do Chamado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Status Operacional *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTO">🟡 Aberto (Novo)</SelectItem>
                  <SelectItem value="TRIADO">🟣 Triado (Encaminhado)</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">🔵 Em Andamento (Equipe em Campo)</SelectItem>
                  <SelectItem value="RESOLVIDO">🟢 Resolvido (Concluído)</SelectItem>
                  <SelectItem value="AVALIADO">⭐ Avaliado pelo Cidadão</SelectItem>
                  <SelectItem value="REJEITADO">🔴 Rejeitado / Inviável</SelectItem>
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
                  <SelectItem value="BAIXA">🟢 Baixa Prioridade</SelectItem>
                  <SelectItem value="MEDIA">🟡 Média Prioridade</SelectItem>
                  <SelectItem value="ALTA">🟠 Alta Prioridade</SelectItem>
                  <SelectItem value="URGENTE">🔴 Urgente / Risco Imediato</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                        <span>{cat.emoji}</span>
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
                Observações Internas da Equipe (Uso Interno)
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
                Resposta Oficial para o Cidadão (Visível ao Munícipe)
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

          {/* Botões de Ação Rápida WhatsApp e Copiar */}
          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-emerald-900">Comunicação Direta:</span> Envie despacho ao cidadão ou à equipe de campo.
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
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
                  shareViaWhatsApp(text);
                }}
                className="bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>WhatsApp</span>
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
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {!confirmDelete ? (
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
                className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 font-semibold px-4"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
