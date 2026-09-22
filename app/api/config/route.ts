import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getRequestAuth, hasAdminAccess } from '@/lib/server-auth';

const DEFAULT_CONFIG = { menu_contexto_cards_ativo: true };

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: false, error: 'Serviço temporariamente indisponível.' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('portal_config')
    .select('menu_contexto_cards_ativo')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[API Config] GET failed', error);
    return NextResponse.json({ success: false, error: 'Não foi possível carregar a configuração.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    config: data ? { menu_contexto_cards_ativo: Boolean(data.menu_contexto_cards_ativo) } : DEFAULT_CONFIG,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: false, error: 'Serviço temporariamente indisponível.' }, { status: 503 });
    }

    const auth = await getRequestAuth(req).catch(() => null);
    if (!auth || !hasAdminAccess(auth.role)) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (typeof body?.menu_contexto_cards_ativo !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Configuração inválida.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('portal_config')
      .update({
        menu_contexto_cards_ativo: body.menu_contexto_cards_ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('menu_contexto_cards_ativo')
      .single();

    if (error) {
      console.error('[API Config] PATCH failed', error);
      return NextResponse.json({ success: false, error: 'Não foi possível salvar a configuração.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config: { menu_contexto_cards_ativo: Boolean(data.menu_contexto_cards_ativo) },
    });
  } catch (error) {
    console.error('[API Config] PATCH failed', error);
    return NextResponse.json({ success: false, error: 'Erro interno ao salvar a configuração.' }, { status: 500 });
  }
}
