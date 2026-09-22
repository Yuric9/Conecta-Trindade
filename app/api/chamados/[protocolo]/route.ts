import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getRequestAuth, hasStaffAccess } from '@/lib/server-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { protocolo: string } | Promise<{ protocolo: string }> }
) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: false, error: 'Serviço temporariamente indisponível.' }, { status: 503 });
    }

    const resolved = await Promise.resolve(params);
    const termo = decodeURIComponent(resolved.protocolo || '').trim();
    if (!termo) return NextResponse.json({ success: false, error: 'Protocolo não informado.' }, { status: 400 });

    // Consulta por protocolo é pública, mas retorna somente os campos de acompanhamento.
    if (/^TRIN-\d{4}-\d{4}$/i.test(termo)) {
      const { data, error } = await supabase.rpc('consultar_chamado_publico', { p_protocolo: termo });
      if (error) {
        console.error('[API Chamados/[protocolo]] public lookup failed', error);
        return NextResponse.json({ success: false, error: 'Não foi possível consultar a solicitação.' }, { status: 500 });
      }
      if (!data?.[0]) return NextResponse.json({ success: false, error: 'Solicitação não encontrada.' }, { status: 404 });
      return NextResponse.json({ success: true, chamado: data[0] });
    }

    // CPF/ID somente para usuário autenticado e com autorização adequada.
    const auth = await getRequestAuth(req).catch(() => null);
    if (!auth) return NextResponse.json({ success: false, error: 'Autenticação necessária para esta consulta.' }, { status: 401 });

    if (hasStaffAccess(auth.role)) {
      const { data, error } = await supabase
        .from('chamados')
        .select('id, protocolo, nome_cidadao, cpf_cidadao, telefone_cidadao, categoria_servico, descricao, endereco, foto_url, status, observacoes_internas, cidadao_id, created_at, updated_at')
        .or(`protocolo.ilike.${termo},id.eq.${termo}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[API Chamados/[protocolo]] staff lookup failed', error);
        return NextResponse.json({ success: false, error: 'Não foi possível consultar a solicitação.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, total: data?.length ?? 0, chamado: data?.[0] ?? null, chamados: data ?? [] });
    }

    return NextResponse.json({ success: false, error: 'Consulta não autorizada.' }, { status: 403 });
  } catch (error) {
    console.error('[API Chamados/[protocolo]] failed', error);
    return NextResponse.json({ success: false, error: 'Erro interno ao consultar a solicitação.' }, { status: 500 });
  }
}
