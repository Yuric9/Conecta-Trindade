'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface PedidoMotivo {
  titulo: string;
  explicacao: string;
  rotulo: string;
  botao: string;
  /** Botão vermelho (cancelar) ou neutro */
  perigo?: boolean;
  protocolo: string;
  /** Grava. Devolve null se deu certo ou a mensagem de erro. */
  confirmar: (motivo: string) => Promise<string | null>;
}

/** Pede o motivo de um passo que exige explicação (cancelar, devolver, recusar). */
export default function AdminDialogoMotivo({ pedido, onFechar }: { pedido: PedidoMotivo | null; onFechar: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setMotivo('');
    setErro(null);
    setSalvando(false);
  }, [pedido]);

  if (!pedido) return null;

  const confirmar = async () => {
    if (!motivo.trim()) {
      setErro('Escreva o motivo: ele fica no histórico da O.S.');
      return;
    }
    setSalvando(true);
    const falha = await pedido.confirmar(motivo.trim());
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !salvando && onFechar()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900">{pedido.titulo}</DialogTitle>
          <p className="text-xs text-gray-500 font-mono">{pedido.protocolo}</p>
        </DialogHeader>
        <p className="text-sm text-gray-600">{pedido.explicacao}</p>
        <div>
          <Label className="text-xs font-semibold text-gray-700">{pedido.rotulo} *</Label>
          <Textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            className="mt-1 text-sm"
            autoFocus
          />
        </div>
        {erro && (
          <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {erro}
          </p>
        )}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onFechar} disabled={salvando} className="text-xs h-9">
            Voltar
          </Button>
          <Button
            type="button"
            onClick={confirmar}
            disabled={salvando}
            className={`text-xs h-9 font-semibold text-white gap-1.5 ${
              pedido.perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-900'
            }`}
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            {pedido.botao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
