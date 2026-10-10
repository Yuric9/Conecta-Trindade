import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { formatData } from '@/lib/types';
import { normalizarStatusOS } from '@/lib/os-status';
import { etapasDoPedido, type DatasPedido } from '@/lib/etapas-cidadao';

/** Linha do tempo do pedido para o cidadão (vertical, cabe no celular). */
export function LinhaTempoCidadao({ pedido }: { pedido: DatasPedido }) {
  if (normalizarStatusOS(pedido.status) === 'Cancelado') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <XCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Pedido cancelado</p>
          <p className="text-xs text-gray-600">
            Recebido em {formatData(pedido.created_at)}. Veja abaixo a resposta da Prefeitura com o motivo.
          </p>
        </div>
      </div>
    );
  }

  const etapas = etapasDoPedido(pedido);
  return (
    <ol className="relative">
      {etapas.map((e, i) => {
        const ultima = i === etapas.length - 1;
        return (
          <li key={e.titulo} className="relative flex gap-3 pb-4 last:pb-0">
            {!ultima && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${e.estado === 'feita' ? 'bg-[#006653]' : 'bg-gray-200'}`}
              />
            )}
            {e.estado === 'feita' ? (
              <CheckCircle2 className="relative w-6 h-6 text-[#006653] shrink-0 bg-white rounded-full" />
            ) : e.estado === 'atual' ? (
              <span className="relative w-6 h-6 shrink-0 rounded-full border-[3px] border-[#006653] bg-[#FFC20E]" />
            ) : (
              <Circle className="relative w-6 h-6 text-gray-300 shrink-0 bg-white rounded-full" />
            )}
            <div className="min-w-0 -mt-0.5">
              <p className={`text-sm font-semibold ${e.estado === 'futura' ? 'text-gray-400' : 'text-gray-900'}`}>
                {e.titulo}
                {e.estado === 'atual' && <span className="ml-2 text-[11px] font-bold uppercase text-[#006653]">agora</span>}
              </p>
              <p className={`text-xs ${e.estado === 'futura' ? 'text-gray-400' : 'text-gray-600'}`}>{e.descricao}</p>
              {e.data && <p className="text-[11px] text-gray-500 mt-0.5">{formatData(e.data)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
