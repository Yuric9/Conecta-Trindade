import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase, isSupabaseConfigured, type ChamadoRow, type StatusChamado } from '@/lib/supabase';
import { getSharedChamadosMemory, addSharedChamado, updateSharedChamadoStatus } from '@/lib/chamados-memory';

/**
 * Gera um protocolo único no formato solicitado:
 * TRIN-2026- + 4 dígitos/letras aleatórias (ex: TRIN-2026-7B4K, TRIN-2026-9X2M)
 */
function gerarProtocoloTrindade(): string {
  // Caracteres alfanuméricos em maiúsculas, evitando caracteres confusos (0/O, 1/I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let sufixo = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    sufixo += chars[idx];
  }
  return `TRIN-2026-${sufixo}`;
}

/**
 * Validação e higienização básica de CPF
 */
function limparCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * POST /api/chamados
 * Recebe a abertura de uma nova solicitação/chamado municipal.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parse do corpo da requisição
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Corpo da requisição inválido. Certifique-se de enviar um JSON válido.',
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados da solicitação não fornecidos.',
        },
        { status: 400 }
      );
    }

    // 2. Extração dos campos (aceita tanto snake_case quanto variações diretas)
    const nome = (body.nome_cidadao || body.nome || '').toString().trim();
    const cpf = (body.cpf_cidadao || body.cpf || '').toString().trim();
    const telefone = (body.telefone_cidadao || body.telefone || '').toString().trim();
    const categoria = (body.categoria_servico || body.categoria || '').toString().trim();
    const descricao = (body.descricao || '').toString().trim();
    const endereco = (body.endereco || '').toString().trim();
    const foto_url = body.foto_url || body.foto || null;

    // 3. Validação dos campos obrigatórios
    const errosValidacao: string[] = [];

    if (!nome) {
      errosValidacao.push('Nome do cidadão é obrigatório (campo: nome_cidadao ou nome)');
    } else if (nome.length < 3) {
      errosValidacao.push('Nome do cidadão deve ter no mínimo 3 caracteres');
    }

    if (!cpf) {
      errosValidacao.push('CPF do cidadão é obrigatório (campo: cpf_cidadao ou cpf)');
    } else {
      const cpfNumeros = limparCpf(cpf);
      if (cpfNumeros.length !== 11) {
        errosValidacao.push('CPF inválido. Deve conter 11 dígitos numéricos');
      }
    }

    if (!categoria) {
      errosValidacao.push('Categoria do serviço é obrigatória (campo: categoria_servico ou categoria)');
    }

    if (!descricao) {
      errosValidacao.push('Descrição da ocorrência é obrigatória (campo: descricao)');
    } else if (descricao.length < 5) {
      errosValidacao.push('A descrição deve ter no mínimo 5 caracteres com detalhes do problema');
    }

    if (!endereco) {
      errosValidacao.push('Endereço ou localização do problema é obrigatório (campo: endereco)');
    }

    // Se houver erros de validação, retorna status 400
    if (errosValidacao.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Falha de validação dos dados obrigatórios.',
          detalhes: errosValidacao,
          campos_obrigatorios: [
            'nome (ou nome_cidadao)',
            'cpf (ou cpf_cidadao)',
            'categoria (ou categoria_servico)',
            'descricao',
            'endereco',
          ],
        },
        { status: 400 }
      );
    }

    // 4. Geração do protocolo único no formato TRIN-2026-XXXX (4 dígitos/letras)
    const protocolo = gerarProtocoloTrindade();
    const chamadoId = randomUUID();
    const timestampAtual = new Date().toISOString();
    const statusInicial: StatusChamado = 'Pendente';

    const novoChamado: ChamadoRow = {
      id: chamadoId,
      protocolo,
      nome_cidadao: nome,
      cpf_cidadao: cpf,
      telefone_cidadao: telefone || '(62) Não informado',
      categoria_servico: categoria,
      descricao,
      endereco,
      foto_url: typeof foto_url === 'string' ? foto_url : null,
      status: statusInicial,
      created_at: timestampAtual,
      updated_at: timestampAtual,
    };

    // 5. Inserção no banco de dados Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error: dbError } = await (supabase.from('chamados') as any)
          .insert({
            id: novoChamado.id,
            protocolo: novoChamado.protocolo,
            nome_cidadao: novoChamado.nome_cidadao,
            cpf_cidadao: novoChamado.cpf_cidadao,
            telefone_cidadao: novoChamado.telefone_cidadao,
            categoria_servico: novoChamado.categoria_servico,
            descricao: novoChamado.descricao,
            endereco: novoChamado.endereco,
            foto_url: novoChamado.foto_url,
            status: novoChamado.status,
            created_at: novoChamado.created_at,
            updated_at: novoChamado.updated_at,
          })
          .select()
          .single();

        if (dbError) {
          console.error('[API Chamados] Erro ao inserir no Supabase:', dbError);
          return NextResponse.json(
            {
              success: false,
              error: 'Erro de comunicação com o banco de dados Supabase ao salvar a solicitação.',
              mensagem_banco: dbError.message,
            },
            { status: 500 }
          );
        }

        const registroCriado = data || novoChamado;

        // 6. Resposta com status 201 (Created)
        return NextResponse.json(
          {
            success: true,
            message: 'Chamado municipal registrado com sucesso!',
            protocolo: registroCriado.protocolo,
            id: registroCriado.id,
            status: registroCriado.status,
            dados: registroCriado,
          },
          { status: 201 }
        );
      } catch (err: any) {
        console.error('[API Chamados] Exceção durante inserção no banco:', err);
        return NextResponse.json(
          {
            success: false,
            error: 'Erro interno de banco de dados ao processar a solicitação.',
            detalhes: err?.message || 'Erro inesperado',
          },
          { status: 500 }
        );
      }
    }

    // Modo de demonstração/preview (caso credenciais do Supabase ainda não tenham sido configuradas no .env)
    addSharedChamado(novoChamado);

    return NextResponse.json(
      {
        success: true,
        message: 'Chamado municipal registrado com sucesso! (Modo Demonstração / Local)',
        protocolo: novoChamado.protocolo,
        id: novoChamado.id,
        status: novoChamado.status,
        dados: novoChamado,
        aviso: 'Supabase em modo fallback de visualização. Para persistência remota, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      },
      { status: 201 }
    );
  } catch (globalError: any) {
    console.error('[API Chamados] Erro inesperado na rota POST:', globalError);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno no servidor ao processar a solicitação.',
        detalhes: globalError?.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chamados
 * Permite consultar chamados por protocolo ou listar registros recentes.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const protocoloParam = searchParams.get('protocolo');
    const cpfParam = searchParams.get('cpf');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

    // Consulta por protocolo específico
    if (protocoloParam) {
      const protoLimpo = protocoloParam.trim();

      if (isSupabaseConfigured) {
        const { data, error } = await (supabase.from('chamados') as any)
          .select('*')
          .ilike('protocolo', protoLimpo)
          .single();

        if (error || !data) {
          return NextResponse.json(
            { success: false, error: `Chamado com protocolo ${protoLimpo} não encontrado.` },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, chamado: data }, { status: 200 });
      }

      // Fallback
      const store = getSharedChamadosMemory();
      const encontrado = store.find(
        (c) => c.protocolo.toLowerCase() === protoLimpo.toLowerCase() || c.id.toLowerCase() === protoLimpo.toLowerCase()
      );
      if (!encontrado) {
        return NextResponse.json(
          { success: false, error: `Chamado com protocolo ${protoLimpo} não encontrado.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, chamado: encontrado }, { status: 200 });
    }

    // Consulta por CPF
    if (cpfParam) {
      const cleanCpf = limparCpf(cpfParam);

      if (isSupabaseConfigured) {
        const { data, error } = await (supabase.from('chamados') as any)
          .select('*')
          .or(`cpf_cidadao.eq.${cpfParam},cpf_cidadao.ilike.%${cleanCpf}%`)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          return NextResponse.json(
            { success: false, error: 'Erro ao consultar chamados por CPF.' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, chamados: data || [] }, { status: 200 });
      }

      const store = getSharedChamadosMemory();
      const filtrados = store.filter(
        (c) => limparCpf(c.cpf_cidadao).includes(cleanCpf)
      );
      return NextResponse.json({ success: true, chamados: filtrados }, { status: 200 });
    }

    // Listagem geral (últimos chamados)
    if (isSupabaseConfigured) {
      const { data, error } = await (supabase.from('chamados') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Erro ao listar chamados.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, total: (data || []).length, chamados: data || [] },
        { status: 200 }
      );
    }

    const store = getSharedChamadosMemory();
    return NextResponse.json(
      { success: true, total: store.length, chamados: store },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar chamados.', detalhes: err?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chamados
 * Permite que fiscais e administradores atualizem o status do chamado em tempo real no banco de dados.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, protocolo, status, observacao } = body || {};

    if (!id && !protocolo) {
      return NextResponse.json(
        { success: false, error: 'ID ou Protocolo do chamado é obrigatório para atualização.' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'O novo status é obrigatório.' },
        { status: 400 }
      );
    }

    const updated_at = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status,
      updated_at,
    };
    if (observacao !== undefined) {
      updatePayload.observacoes_internas = observacao;
    }

    // Atualização no Supabase se configurado
    if (isSupabaseConfigured) {
      let query = (supabase.from('chamados') as any).update(updatePayload);
      if (id) {
        query = query.eq('id', id);
      } else if (protocolo) {
        query = query.eq('protocolo', protocolo);
      }

      const { data, error } = await query.select().single();

      if (error) {
        console.error('[API Chamados] Erro ao atualizar status no Supabase:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao atualizar status no banco de dados Supabase.',
            mensagem_banco: error.message,
          },
          { status: 500 }
        );
      }

      // Sincroniza também na memória compartilhada
      updateSharedChamadoStatus(protocolo || id, status as StatusChamado, observacao);

      return NextResponse.json(
        {
          success: true,
          message: `Status atualizado para "${status}" com sucesso!`,
          chamado: data,
        },
        { status: 200 }
      );
    }

    // Fallback de memória para dev / preview
    const updatedChamado = updateSharedChamadoStatus(protocolo || id, status as StatusChamado, observacao);

    if (updatedChamado) {
      return NextResponse.json(
        {
          success: true,
          message: `Status atualizado para "${status}" com sucesso! (Modo Local/Fallback)`,
          chamado: updatedChamado,
        },
        { status: 200 }
      );
    }

    // Se não encontrou na memória estática, cria objeto de confirmação
    return NextResponse.json(
      {
        success: true,
        message: `Status do chamado ${protocolo || id} atualizado para "${status}"!`,
        chamado: { id, protocolo, status, updated_at },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[API Chamados] Erro inesperado no PATCH:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar atualização.', detalhes: err?.message },
      { status: 500 }
    );
  }
}
