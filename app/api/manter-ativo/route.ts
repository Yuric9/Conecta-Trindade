import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { clienteAdminSupabase } from '@/lib/supabase/server-admin';
import { executarRotinaArquivamento } from '@/lib/rotina-arquivamento';

/**
 * Rotina diária do site. A Vercel chama esta rota uma vez por dia (veja
 * "crons" em vercel.json):
 *  1. "Despertador": uma leitura simples para o banco gratuito do Supabase
 *     não pausar por ficar 7 dias sem uso.
 *  2. Arquivamento: O.S. concluídas há mais de 30 dias têm as fotos apagadas
 *     e saem da lista principal do painel (lib/rotina-arquivamento.ts).
 *
 * Se a variável CRON_SECRET existir na Vercel, o arquivamento só roda quando
 * quem chama é o próprio agendador da Vercel (que envia esse segredo).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true, banco: 'nao_configurado' });
  }

  const { error } = await (supabase.from('portal_config') as any).select('id').limit(1);
  if (error) {
    console.error('[manter-ativo] falha ao acessar o banco:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const segredo = process.env.CRON_SECRET;
  const autorizado = !segredo || req.headers.get('authorization') === `Bearer ${segredo}`;
  const admin = clienteAdminSupabase();
  if (!autorizado || !admin) {
    return NextResponse.json({ success: true, banco: 'ativo' });
  }

  try {
    const arquivamento = await executarRotinaArquivamento(admin);
    return NextResponse.json({ success: true, banco: 'ativo', arquivamento });
  } catch (erroRotina) {
    console.error('[manter-ativo] falha no arquivamento:', erroRotina);
    // O banco respondeu; só o arquivamento falhou (tenta de novo amanhã)
    return NextResponse.json({ success: true, banco: 'ativo', arquivamento: 'falhou' });
  }
}
