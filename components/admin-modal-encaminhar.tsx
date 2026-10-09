'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Chamado, Profile } from '@/lib/types';
import { getCategoriaInfo, normalizeCategoria } from '@/lib/types';
import { normalizarStatusOS } from '@/lib/os-status';
import { formatarOSParaCoordenador, abrirWhatsAppPara } from '@/lib/whatsapp-share';
import { CategoriaIcone } from '@/components/categoria-icone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageCircle, CheckCircle2, AlertTriangle, MapPin, HardHat, Loader2 } from 'lucide-react';

export interface DadosEncaminhamento {
  coordenador_id: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  sla_limite: string;
  observacao: string;
}

interface Props {
  chamado: Chamado | null;
  coordenadores: Profile[];
  open: boolean;
  onClose: () => void;
  /** Grava no banco. Devolve null se deu certo ou a mensagem de erro. */
  onConfirmar: (chamado: Chamado, dados: DadosEncaminhamento) => Promise<string | null>;
}

/** Valor para <input type="datetime-local"> no horário local. */
function paraInputLocal(data: Date): string {
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminModalEncaminhar({ chamado, coordenadores, open, onClose, onConfirmar }: Props) {
  const [coordenadorId, setCoordenadorId] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [prioridade, setPrioridade] = useState<DadosEncaminhamento['prioridade']>('MEDIA');
  const [prazo, setPrazo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const categoria = chamado ? normalizeCategoria(chamado.categoria) : 'OUTROS';
  const catInfo = getCategoriaInfo(categoria);
  const jaTemCoordenador = Boolean(chamado?.coordenador_id);

  const ativos = useMemo(
    () => coordenadores.filter((p) => p.role === 'coordenador' && (p.status || 'ativo') === 'ativo'),
    [coordenadores]
  );
  // Sugeridos: os que atendem o serviço desta O.S.
  const sugeridos = useMemo(() => ativos.filter((p) => (p.servicos || []).includes(categoria)), [ativos, categoria]);
  const opcoes = mostrarTodos || sugeridos.length === 0 ? ativos : sugeridos;

  useEffect(() => {
    if (!chamado || !open) return;
    const atual = chamado.coordenador_id && ativos.some((p) => p.id === chamado.coordenador_id) ? chamado.coordenador_id : '';
    setCoordenadorId(atual || (sugeridos.length === 1 ? sugeridos[0].id : ''));
    setMostrarTodos(Boolean(atual) && !sugeridos.some((p) => p.id === atual));
    setPrioridade(chamado.prioridade || 'MEDIA');
    setPrazo(
      paraInputLocal(chamado.sla_limite ? new Date(chamado.sla_limite) : new Date(Date.now() + catInfo.slaHoras * 3600000))
    );
    setObservacao('');
    setErro(null);
    setEnviado(false);
    setSalvando(false);
    // Reinicia o formulário só quando abre ou troca de O.S.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamado?.id, open]);

  if (!chamado) return null;

  const coordenador = ativos.find((p) => p.id === coordenadorId);

  const confirmar = async () => {
    if (!coordenadorId) {
      setErro('Escolha o coordenador responsável.');
      return;
    }
    if (!prazo) {
      setErro('Informe o prazo.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const falha = await onConfirmar(chamado, {
      coordenador_id: coordenadorId,
      prioridade,
      sla_limite: new Date(prazo).toISOString(),
      observacao: observacao.trim(),
    });
    setSalvando(false);
    if (falha) setErro(falha);
    else setEnviado(true);
  };

  const avisarNoWhatsApp = () => {
    if (!coordenador) return;
    const texto = formatarOSParaCoordenador({
      protocolo: chamado.protocolo,
      categoria,
      coordenadorNome: coordenador.nome,
      prioridade,
      sla_limite: prazo ? new Date(prazo).toISOString() : null,
      endereco: chamado.endereco_texto,
      descricao: chamado.descricao,
      cidadao_nome: chamado.cidadao_nome,
      cidadao_telefone: chamado.cidadao_telefone,
      latitude: chamado.latitude,
      longitude: chamado.longitude,
      observacao: observacao.trim() || undefined,
    });
    abrirWhatsAppPara(coordenador.telefone, texto);
  };

  const titulo = jaTemCoordenador && normalizarStatusOS(chamado.status) !== 'Pendente' ? 'Trocar coordenador' : 'Encaminhar O.S.';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !salvando && onClose()}>
      <DialogContent className="max-w-lg bg-white max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#006653]" />
            {enviado ? 'O.S. encaminhada' : titulo}
          </DialogTitle>
          <p className="text-xs text-gray-500 font-mono">{chamado.protocolo}</p>
        </DialogHeader>

        {/* Resumo da O.S. */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs space-y-1">
          <p className="flex items-center gap-1.5 font-semibold text-gray-800">
            <CategoriaIcone categoria={categoria} className="w-3.5 h-3.5" />
            {catInfo.label}
          </p>
          <p className="text-gray-600 line-clamp-2">{chamado.descricao || 'Sem descrição'}</p>
          <p className="flex items-start gap-1 text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-[#006653] shrink-0 mt-px" />
            {chamado.endereco_texto || 'Sem endereço'}
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                A O.S. está com <strong>{coordenador?.nome}</strong> e ficou registrada no histórico. Agora avise o
                coordenador pelo WhatsApp.
              </span>
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs h-9">
                Fechar
              </Button>
              <Button
                type="button"
                onClick={avisarNoWhatsApp}
                className="bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs h-9 gap-1.5 font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                Avisar {coordenador?.nome?.split(' ')[0] || 'coordenador'} no WhatsApp
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Coordenador responsável *</Label>
                {sugeridos.length > 0 && sugeridos.length < ativos.length && (
                  <button
                    type="button"
                    onClick={() => setMostrarTodos((v) => !v)}
                    className="text-[11px] text-[#006653] font-semibold hover:underline"
                  >
                    {mostrarTodos ? 'Só quem atende este serviço' : 'Mostrar todos'}
                  </button>
                )}
              </div>
              {ativos.length === 0 ? (
                <p className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Nenhum coordenador cadastrado. Cadastre na aba Usuários com a função &quot;Coordenador de
                  Serviço&quot;.
                </p>
              ) : (
                <>
                  <Select value={coordenadorId} onValueChange={setCoordenadorId}>
                    <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                      <SelectValue placeholder="Escolha o coordenador" />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-1.5">
                            <HardHat className="w-3.5 h-3.5 text-orange-600" />
                            {p.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sugeridos.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Nenhum coordenador marcou &quot;{catInfo.label}&quot; nos serviços. Mostrando todos.
                    </p>
                  )}
                  {coordenador && !coordenador.telefone && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Este coordenador está sem telefone cadastrado: o WhatsApp vai abrir sem o contato.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Prioridade</Label>
                <Select value={prioridade} onValueChange={(v) => setPrioridade(v as DadosEncaminhamento['prioridade'])}>
                  <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA">Baixa</SelectItem>
                    <SelectItem value="MEDIA">Média</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Prazo</Label>
                <Input
                  type="datetime-local"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="h-9 text-xs mt-1 bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Padrão do serviço: {catInfo.slaHoras} h</p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Observação para o coordenador</Label>
              <Textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: levar escada; morador pede contato antes"
                maxLength={500}
                className="text-xs mt-1 bg-white"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Vai na mensagem e fica no histórico da O.S.</p>
            </div>

            {erro && (
              <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {erro}
              </p>
            )}

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={salvando} className="text-xs h-9">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmar}
                disabled={salvando || ativos.length === 0}
                className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 gap-1.5 font-semibold"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {titulo === 'Trocar coordenador' ? 'Trocar coordenador' : 'Encaminhar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
