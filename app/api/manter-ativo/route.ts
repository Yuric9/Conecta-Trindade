import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * "Despertador" do banco de dados.
 *
 * No plano gratuito, o Supabase pausa o projeto depois de 7 dias sem uso.
 * A Vercel chama esta rota uma vez por dia (veja "crons" em vercel.json),
 * fazendo uma leitura simples para o banco nunca ficar parado.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true, banco: 'nao_configurado' });
  }

  const { error } = await (supabase.from('portal_config') as any).select('id').limit(1);
  if (error) {
    console.error('[manter-ativo] falha ao acessar o banco:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
  return NextResponse.json({ success: true, banco: 'ativo' });
}
