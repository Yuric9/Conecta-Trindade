'use client';

import React, { useState } from 'react';
import type { Chamado, ChamadoCategoria, ChamadoSecretaria, ChamadoStatus } from '@/lib/types';
import {
  CATEGORIAS,
  SECRETARIAS,
  SLA_PADRAO_HORAS,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, MapPin, User, FileText } from 'lucide-react';

interface AdminModalNovoChamadoProps {
  open: boolean;
  onClose: () => void;
  onCreate: (novo: Partial<Chamado>) => void;
}

export default function AdminModalNovoChamado({
  open,
  onClose,
  onCreate,
}: AdminModalNovoChamadoProps) {
  const [categoria, setCategoria] = useState<ChamadoCategoria>('ILUMINACAO');
  const [secretaria, setSecretaria] = useState<ChamadoSecretaria | 'NONE'>('SERVICOS_PUBLICOS');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [status, setStatus] = useState<ChamadoStatus>('ABERTO');
  const [enderecoTexto, setEnderecoTexto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cidadaoNome, setCidadaoNome] = useState('');
  const [cidadaoTelefone, setCidadaoTelefone] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !enderecoTexto.trim()) return;

    const horasSla = SLA_PADRAO_HORAS[categoria] || 72;
    const slaLimite = new Date(Date.now() + horasSla * 3600000).toISOString();

    onCreate({
      categoria,
      secretaria: secretaria === 'NONE' ? null : secretaria,
      prioridade,
      status,
      endereco_texto: enderecoTexto.trim(),
      descricao: descricao.trim(),
      cidadao_nome: cidadaoNome.trim() || 'Atendimento Presencial / Telefone',
      cidadao_telefone: cidadaoTelefone.trim() || undefined,
      observacoes_internas: observacoesInternas.trim() || undefined,
      latitude: -16.6496 + (Math.random() - 0.5) * 0.02,
      longitude: -49.4912 + (Math.random() - 0.5) * 0.02,
      fotos: [],
      sla_limite: slaLimite,
    });

    onClose();
    // Reset form
    setDescricao('');
    setEnderecoTexto('');
    setCidadaoNome('');
    setCidadaoTelefone('');
    setObservacoesInternas('');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#006653]" />
            <span>Cadastrar Nova Ordem de Serviço (Abertura Manual)</span>
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Utilize para registrar chamados recebidos por telefone, ofício ou atendimento presencial no balcão da Prefeitura.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {/* Cidadão */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <Label className="text-xs font-bold text-gray-800 flex items-center gap-1 mb-2">
              <User className="w-3.5 h-3.5 text-[#006653]" />
              <span>Dados do Munícipe Solicitante</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-600">Nome do Solicitante</Label>
                <Input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={cidadaoNome}
                  onChange={(e) => setCidadaoNome(e.target.value)}
                  className="h-8 text-xs mt-0.5 bg-white"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-600">Telefone / WhatsApp</Label>
                <Input
                  type="text"
                  placeholder="(62) 99999-9999"
                  value={cidadaoTelefone}
                  onChange={(e) => setCidadaoTelefone(e.target.value)}
                  className="h-8 text-xs mt-0.5 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Categoria e Secretaria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Categoria do Serviço *</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-1.5">
                        <span>{c.emoji}</span>
                        <span>{c.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Secretaria Designada</Label>
              <Select value={secretaria} onValueChange={(v) => setSecretaria(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white">
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
              <Label className="text-xs font-semibold text-gray-700">Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">🟢 Baixa</SelectItem>
                  <SelectItem value="MEDIA">🟡 Média</SelectItem>
                  <SelectItem value="ALTA">🟠 Alta</SelectItem>
                  <SelectItem value="URGENTE">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Localização */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#006653]" />
              <span>Endereço Completo e Bairro *</span>
            </Label>
            <Input
              required
              type="text"
              placeholder="Ex: Rua das Flores, Qd. 12, Setor Oeste, Trindade - GO"
              value={enderecoTexto}
              onChange={(e) => setEnderecoTexto(e.target.value)}
              className="h-9 text-xs mt-1 bg-white"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#006653]" />
              <span>Descrição da Ocorrência *</span>
            </Label>
            <Textarea
              required
              rows={3}
              placeholder="Descreva a demanda, pontos de referência e detalhes do problema relatado..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs mt-1 bg-white"
            />
          </div>

          {/* Observações Internas */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Notas de Triagem / Atendimento (Interno)</Label>
            <Input
              type="text"
              placeholder="Ex: Cidadão compareceu presencialmente na sede da secretaria."
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              className="h-9 text-xs mt-1 bg-white"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 font-semibold px-4"
            >
              Registrar Chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
