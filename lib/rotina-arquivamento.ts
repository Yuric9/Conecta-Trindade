/**
 * Rotina diária de arquivamento (só no servidor, com a chave secreta).
 *
 * 30 dias depois de concluída, a O.S. tem as fotos apagadas do Storage e é
 * arquivada (sai da lista principal do painel). Os dados do pedido e os
 * cadastros das pessoas nunca são apagados.
 * Funções do banco: supabase/migrations/20261014000002_arquivamento_chamados.sql
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_FOTOS } from '@/lib/fotos-os';

export const DIAS_ATE_ARQUIVAR = 30;

export interface ResultadoRotina {
  fotosApagadas: number;
  osSemFoto: number;
  arquivadas: number;
}

export async function executarRotinaArquivamento(admin: SupabaseClient): Promise<ResultadoRotina> {
  const resultado: ResultadoRotina = { fotosApagadas: 0, osSemFoto: 0, arquivadas: 0 };

  // 1. Fotos vencidas: apaga a pasta da O.S. no Storage e limpa os campos
  const { data: vencidas, error: erroLista } = await admin.rpc('rotina_fotos_vencidas', {
    p_dias: DIAS_ATE_ARQUIVAR,
    p_limite: 100,
  });
  if (erroLista) throw erroLista;

  for (const os of (vencidas as { id: string }[]) || []) {
    const { data: arquivos, error: erroPasta } = await admin.storage.from(BUCKET_FOTOS).list(os.id, { limit: 100 });
    if (erroPasta) {
      console.error('[rotina] não listou as fotos da O.S.', os.id, erroPasta);
      continue;
    }
    const caminhos = (arquivos || []).map((a) => `${os.id}/${a.name}`);
    if (caminhos.length > 0) {
      const { error: erroApagar } = await admin.storage.from(BUCKET_FOTOS).remove(caminhos);
      if (erroApagar) {
        console.error('[rotina] não apagou as fotos da O.S.', os.id, erroApagar);
        continue; // tenta de novo amanhã
      }
      resultado.fotosApagadas += caminhos.length;
    }
    // Também cobre fotos antigas gravadas como texto dentro da tabela
    const { error: erroCampos } = await (admin.from('chamados') as any)
      .update({ foto_url: null, foto_execucao_url: null, fotos_expiradas_em: new Date().toISOString() })
      .eq('id', os.id);
    if (erroCampos) {
      console.error('[rotina] não limpou os campos de foto da O.S.', os.id, erroCampos);
      continue;
    }
    resultado.osSemFoto += 1;
  }

  // 2. Arquiva as concluídas há mais de 30 dias
  const { data: arquivadas, error: erroArquivar } = await admin.rpc('rotina_arquivar_concluidos', {
    p_dias: DIAS_ATE_ARQUIVAR,
  });
  if (erroArquivar) throw erroArquivar;
  resultado.arquivadas = Number(arquivadas) || 0;

  return resultado;
}
