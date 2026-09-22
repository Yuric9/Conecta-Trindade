import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const DEFAULT_CONFIG = { menu_contexto_cards_ativo: true };
let memoryConfig = { ...DEFAULT_CONFIG };

export async function GET() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await (supabase.from('portal_config') as any)
        .select('menu_contexto_cards_ativo')
        .eq('id', 1)
        .maybeSingle();
      if (!error && data) {
        return NextResponse.json({ success: true, config: { menu_contexto_cards_ativo: Boolean(data.menu_contexto_cards_ativo) } });
      }
    } catch (error) {
      console.warn('[API Config] fallback para memória:', error);
    }
  }
  return NextResponse.json({ success: true, config: memoryConfig, source: 'memory' });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const enabled = Boolean(body?.menu_contexto_cards_ativo);
    const nextConfig = { menu_contexto_cards_ativo: enabled };
    memoryConfig = nextConfig;

    if (isSupabaseConfigured) {
      const { data, error } = await (supabase.from('portal_config') as any)
        .upsert({ id: 1, menu_contexto_cards_ativo: enabled, updated_at: new Date().toISOString() })
        .select('menu_contexto_cards_ativo')
        .single();
      if (error) {
        console.error('[API Config] erro ao persistir no Supabase:', error);
        return NextResponse.json({ success: false, error: error.message, config: nextConfig }, { status: 500 });
      }
      return NextResponse.json({ success: true, config: { menu_contexto_cards_ativo: Boolean(data.menu_contexto_cards_ativo) }, source: 'supabase' });
    }

    return NextResponse.json({ success: true, config: nextConfig, source: 'memory' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Configuração inválida.' }, { status: 400 });
  }
}
