import { redirect } from 'next/navigation';

/**
 * Tela antiga de solicitação (gravava no formato antigo da tabela).
 * Mantida só para links salvos: redireciona para a tela atual.
 */
export default function NovaSolicitacaoPage() {
  redirect('/solicitar');
}
