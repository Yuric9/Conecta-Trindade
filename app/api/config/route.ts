import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { requireStaff } from '@/lib/supabase/server-auth';
import { normalizarCityConfig, type CityConfig } from '@/lib/city-config';

type Config = { menu_contexto_cards_ativo: boolean; cidade: CityConfig };

let memoryConfig: Config = { menu_contexto_cards_ativo: true, cidade: normalizarCityConfig({}) };

function montar(data: any): Config {
  return {
    menu_contexto_cards_ativo: Boolean(data?.menu_contexto_cards_ativo),
    cidade: normalizarCityConfig(data?.cidade),
  };
}

export async function GET() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await (supabase.from('portal_config') as any)
        .select('menu_contexto_cards_ativo, cidade')
        .eq('id', 1)
        .maybeSingle();
      if (!error && data) {
        return NextResponse.json({ success: true, config: montar(data) });
      }
    } catch (error) {
      console.warn('[API Config] fallback para memória:', error);
    }
  }
  return NextResponse.json({ success: true, config: memoryConfig, source: 'memory' });
}

// Alterar a configuração do portal é exclusivo de administradores.
// Só os campos enviados mudam (menu rápido e/ou dados da cidade).
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireStaff(req, { adminOnly: true });
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const mudancas: Record<string, unknown> = {};
    if (typeof body?.menu_contexto_cards_ativo === 'boolean') {
      mudancas.menu_contexto_cards_ativo = body.menu_contexto_cards_ativo;
    }
    if (body?.cidade && typeof body.cidade === 'object') {
      mudancas.cidade = normalizarCityConfig(body.cidade);
    }
    if (Object.keys(mudancas).length === 0) {
      return NextResponse.json({ success: false, error: 'Nada para salvar.' }, { status: 400 });
    }

    if (auth.client) {
      const { data, error } = await (auth.client.from('portal_config') as any)
        .update({ ...mudancas, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select('menu_contexto_cards_ativo, cidade')
        .single();
      if (error) {
        console.error('[API Config] erro ao persistir no Supabase:', error);
        return NextResponse.json({ success: false, error: 'Não foi possível salvar a configuração.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, config: montar(data), source: 'supabase' });
    }

    memoryConfig = { ...memoryConfig, ...mudancas } as Config;
    return NextResponse.json({ success: true, config: memoryConfig, source: 'memory' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Configuração inválida.' }, { status: 400 });
  }
}
