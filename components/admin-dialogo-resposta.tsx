'use client';

import { useEffect, useState } from 'react';
import type { Chamado } from '@/lib/types';
import { getCategoriaInfo, formatData } from '@/lib/types';
import { normalizarStatusOS } from '@/lib/os-status';
import { abrirWhatsAppPara } from '@/lib/whatsapp-share';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, MessageSquareReply } from 'lucide-react';

/** Texto inicial da resposta, para a central só ajustar. */
export function modeloResposta(c: Chamado): string {
  const nome = (c.cidadao_nome || '').trim().split(' ')[0];
  const ola = nome ? `Olá, ${nome}!` : 'Olá!';
  const servico = getCategoriaInfo(c.categoria).label;
  if (normalizarStatusOS(c.status) === 'Cancelado') {
    return `${ola} Sua solicitação ${c.protocolo} (${servico}) foi encerrada sem execução pelo seguinte motivo: . Em caso de dúvida, fale com a Central de Atendimento da Prefeitura de Trindade: (62) 3506-7000.`;
  }
  const quando = c.concluido_em ? ` em ${formatData(c.concluido_em).slice(0, 10)}` : '';
  return `${ola} Sua solicitação ${c.protocolo} (${servico}) foi atendida pela Secretaria de Infraestrutura${quando}. Obrigado por ajudar a cuidar de Trindade!`;
}

interface Props {
  chamado: Chamado | null;
  onFechar: () => void;
  /** Grava a resposta. Devolve null se deu certo ou a mensagem de erro. */
  onSalvar: (chamado: Chamado, resposta: string) => Promise<string | null>;
}

/** Central escreve a resposta ao cidadão (aparece em "Acompanhar") e pode mandar no WhatsApp. */
export default function AdminDialogoResposta({ chamado, onFechar, onSalvar }: Props) {
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!chamado) return;
    setTexto(chamado.resposta_cidadao || modeloResposta(chamado));
    setErro(null);
    setSalvo(false);
    setSalvando(false);
  }, [chamado]);

  if (!chamado) return null;

  const salvar = async () => {
    if (!texto.trim()) {
      setErro('Escreva a resposta para o cidadão.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const falha = await onSalvar(chamado, texto.trim());
    setSalvando(false);
    if (falha) setErro(falha);
    else setSalvo(true);
  };

  const enviarWhatsApp = () => {
    const origem = typeof window !== 'undefined' ? window.location.origin : '';
    abrirWhatsAppPara(
      chamado.cidadao_telefone,
      `${texto.trim()}\n\n🔍 Acompanhe pelo protocolo ${chamado.protocolo}: ${origem}/acompanhar\n\n_Prefeitura de Trindade – Central de Atendimento_`
    );
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !salvando && onFechar()}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MessageSquareReply className="w-4 h-4 text-[#006653]" />
            Resposta ao cidadão
          </DialogTitle>
          <p className="text-xs text-gray-500 font-mono">
            {chamado.protocolo} · {chamado.cidadao_nome || 'Cidadão'}
            {chamado.cidadao_telefone ? ` · ${chamado.cidadao_telefone}` : ''}
          </p>
        </DialogHeader>

        <div>
          <Label className="text-xs font-semibold text-gray-700">Mensagem *</Label>
          <Textarea
            rows={5}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setSalvo(false);
            }}
            maxLength={2000}
            className="mt-1 text-sm"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Aparece para o cidadão na consulta do protocolo (Acompanhar) e fica no histórico da O.S.
          </p>
        </div>

        {salvo && (
          <p className="flex items-start gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
            Resposta salva. Se quiser, envie também no WhatsApp do cidadão.
          </p>
        )}
        {erro && (
          <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {erro}
          </p>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onFechar} disabled={salvando} className="text-xs h-9">
            Fechar
          </Button>
          {salvo ? (
            <Button
              type="button"
              onClick={enviarWhatsApp}
              className="bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs h-9 gap-1.5 font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar no WhatsApp do cidadão
            </Button>
          ) : (
            <Button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="bg-[#006653] hover:bg-[#004d3e] text-white text-xs h-9 gap-1.5 font-semibold"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar resposta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
