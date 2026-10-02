import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { requireStaff } from '@/lib/supabase/server-auth';

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

// Alterar a configuração do portal é exclusivo de administradores.
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireStaff(req, { adminOnly: true });
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const enabled = Boolean(body?.menu_contexto_cards_ativo);
    const nextConfig = { menu_contexto_cards_ativo: enabled };

    if (auth.client) {
      const { data, error } = await (auth.client.from('portal_config') as any)
        .upsert({ id: 1, menu_contexto_cards_ativo: enabled, updated_at: new Date().toISOString() })
        .select('menu_contexto_cards_ativo')
        .single();
      if (error) {
        console.error('[API Config] erro ao persistir no Supabase:', error);
        return NextResponse.json({ success: false, error: 'Não foi possível salvar a configuração.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, config: { menu_contexto_cards_ativo: Boolean(data.menu_contexto_cards_ativo) }, source: 'supabase' });
    }

    memoryConfig = nextConfig;
    return NextResponse.json({ success: true, config: nextConfig, source: 'memory' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Configuração inválida.' }, { status: 400 });
  }
}
