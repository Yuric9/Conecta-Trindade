import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, type StatusChamado } from '@/lib/supabase';
import { getRequestAuth, hasStaffAccess } from '@/lib/server-auth';

const STATUS_VALIDOS: StatusChamado[] = ['Pendente', 'Em Análise', 'Em Andamento', 'Concluído', 'Cancelado'];

function limparCpf(value: string): string {
  return value.replace(/\D/g, '');
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error('SUPABASE_NOT_CONFIGURED');
}

export async function POST(req: NextRequest) {
  try {
    requireSupabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return jsonError('Dados da solicitação inválidos.', 400);

    const nome = String(body.nome_cidadao ?? body.nome ?? '').trim();
    const cpf = limparCpf(String(body.cpf_cidadao ?? body.cpf ?? ''));
    const telefone = String(body.telefone_cidadao ?? body.telefone ?? '').trim();
    const categoria = String(body.categoria_servico ?? body.categoria ?? '').trim();
    const descricao = String(body.descricao ?? '').trim();
    const endereco = String(body.endereco ?? '').trim();
    const foto_url = typeof body.foto_url === 'string' ? body.foto_url.trim() || null : null;

    const erros: string[] = [];
    if (nome.length < 3) erros.push('Nome do cidadão é obrigatório.');
    if (cpf.length !== 11) erros.push('CPF inválido.');
    if (!categoria) erros.push('Categoria do serviço é obrigatória.');
    if (descricao.length < 5) erros.push('A descrição deve ter no mínimo 5 caracteres.');
    if (!endereco) erros.push('Endereço ou localização é obrigatório.');

    if (erros.length) return NextResponse.json({ success: false, error: 'Falha de validação.', detalhes: erros }, { status: 400 });

    const auth = await getRequestAuth(req).catch(() => null);
    const id = randomUUID();

    const { error } = await supabase.from('chamados').insert({
      id,
      cidadao_id: auth?.user.id ?? null,
      nome_cidadao: nome,
      cpf_cidadao: cpf,
      telefone_cidadao: telefone,
      categoria_servico: categoria,
      descricao,
      endereco,
      foto_url,
    });

    if (error) {
      console.error('[API Chamados] insert failed', error);
      return jsonError('Não foi possível registrar a solicitação.', 500);
    }

    const { data: publicData, error: publicError } = await supabase.rpc('consultar_chamado_publico_por_id', { p_id: id });
    if (publicError || !publicData?.[0]) {
      console.error('[API Chamados] public confirmation lookup failed', publicError);
      return jsonError('Solicitação registrada, mas não foi possível obter o protocolo. Consulte o atendimento.', 500);
    }

    return NextResponse.json({
      success: true,
      message: 'Chamado municipal registrado com sucesso.',
      protocolo: publicData[0].protocolo,
      id: publicData[0].id,
      status: publicData[0].status,
      created_at: publicData[0].created_at,
    }, { status: 201 });
  } catch (error) {
    console.error('[API Chamados] POST failed', error);
    if (error instanceof Error && error.message === 'SUPABASE_NOT_CONFIGURED') {
      return jsonError('Serviço temporariamente indisponível: banco de dados não configurado.', 503);
    }
    return jsonError('Erro interno ao processar a solicitação.', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    requireSupabase();
    const { searchParams } = new URL(req.url);
    const protocolo = searchParams.get('protocolo')?.trim();
    const cpf = searchParams.get('cpf')?.trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);

    if (protocolo) {
      const { data, error } = await supabase.rpc('consultar_chamado_publico', { p_protocolo: protocolo });
      if (error) {
        console.error('[API Chamados] public lookup failed', error);
        return jsonError('Não foi possível consultar a solicitação.', 500);
      }
      if (!data?.[0]) return jsonError('Solicitação não encontrada.', 404);
      return NextResponse.json({ success: true, chamado: data[0] });
    }

    if (cpf) {
      const auth = await getRequestAuth(req).catch(() => null);
      if (!auth) return jsonError('Autenticação necessária para consultar por CPF.', 401);

      if (hasStaffAccess(auth.role)) {
        const cleanCpf = limparCpf(cpf);
        const { data, error } = await supabase
          .from('chamados')
          .select('id, protocolo, nome_cidadao, cpf_cidadao, telefone_cidadao, categoria_servico, descricao, endereco, foto_url, status, observacoes_internas, created_at, updated_at')
          .eq('cpf_cidadao', cleanCpf)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) {
          console.error('[API Chamados] staff CPF lookup failed', error);
          return jsonError('Não foi possível consultar os chamados.', 500);
        }
        return NextResponse.json({ success: true, chamados: data ?? [] });
      }

      const { data, error } = await supabase.rpc('consultar_meus_chamados_por_cpf', { p_cpf: cpf });
      if (error) {
        console.error('[API Chamados] citizen CPF lookup failed', error);
        return jsonError('Não foi possível consultar seus chamados.', 500);
      }
      return NextResponse.json({ success: true, chamados: data ?? [] });
    }

    const auth = await getRequestAuth(req).catch(() => null);
    if (!auth || !hasStaffAccess(auth.role)) return jsonError('Acesso não autorizado.', 403);

    const { data, error } = await supabase
      .from('chamados')
      .select('id, protocolo, nome_cidadao, cpf_cidadao, telefone_cidadao, categoria_servico, descricao, endereco, foto_url, status, observacoes_internas, cidadao_id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[API Chamados] staff list failed', error);
      return jsonError('Não foi possível listar os chamados.', 500);
    }

    return NextResponse.json({ success: true, total: data?.length ?? 0, chamados: data ?? [] });
  } catch (error) {
    console.error('[API Chamados] GET failed', error);
    if (error instanceof Error && error.message === 'SUPABASE_NOT_CONFIGURED') {
      return jsonError('Serviço temporariamente indisponível: banco de dados não configurado.', 503);
    }
    return jsonError('Erro interno ao consultar solicitações.', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireSupabase();
    const auth = await getRequestAuth(req).catch(() => null);
    if (!auth || !hasStaffAccess(auth.role)) return jsonError('Acesso não autorizado.', 403);

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const protocolo = typeof body?.protocolo === 'string' ? body.protocolo.trim() : '';
    const status = body?.status as StatusChamado;
    const observacao = body?.observacao;

    if (!id && !protocolo) return jsonError('ID ou protocolo é obrigatório.', 400);
    if (!STATUS_VALIDOS.includes(status)) return jsonError('Status inválido.', 400);
    if (observacao !== undefined && typeof observacao !== 'string') return jsonError('Observação inválida.', 400);

    const payload: Record<string, unknown> = { status };
    if (observacao !== undefined) payload.observacoes_internas = observacao.trim();

    let query = supabase.from('chamados').update(payload);
    query = id ? query.eq('id', id) : query.eq('protocolo', protocolo);

    const { data, error } = await query
      .select('id, protocolo, nome_cidadao, cpf_cidadao, telefone_cidadao, categoria_servico, descricao, endereco, foto_url, status, observacoes_internas, cidadao_id, created_at, updated_at')
      .single();

    if (error) {
      console.error('[API Chamados] PATCH failed', error);
      return jsonError('Não foi possível atualizar a solicitação.', 500);
    }

    return NextResponse.json({ success: true, chamado: data });
  } catch (error) {
    console.error('[API Chamados] PATCH failed', error);
    if (error instanceof Error && error.message === 'SUPABASE_NOT_CONFIGURED') {
      return jsonError('Serviço temporariamente indisponível: banco de dados não configurado.', 503);
    }
    return jsonError('Erro interno ao atualizar a solicitação.', 500);
  }
}
