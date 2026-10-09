import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomInt } from 'crypto';
import { supabase, isSupabaseConfigured, type ChamadoRow, type StatusChamado } from '@/lib/supabase';
import { getSharedChamadosMemory, addSharedChamado, updateSharedChamadoStatus } from '@/lib/chamados-memory';
import { normalizarTermoBusca, buscarChamadosPublico } from '@/lib/chamados-publico';
import { requireStaff, usuarioOpcional } from '@/lib/supabase/server-auth';
import { isWithinTrindade } from '@/lib/geo';

// "Em Análise" saiu do fluxo da O.S. (ver lib/os-status.ts)
const STATUS_VALIDOS: StatusChamado[] = [
  'Pendente',
  'Na Secretaria',
  'Encaminhada',
  'Em Andamento',
  'Aguardando Confirmação',
  'Concluído',
  'Cancelado',
];

// Colunas que a equipe lê. O CPF do cidadão fica de fora: pela API ninguém
// lê (só o admin, pela função cpf_cidadao_os). Ver migration 20261009000006.
const COLUNAS_PAINEL = [
  'id', 'protocolo', 'nome_cidadao', 'telefone_cidadao', 'categoria_servico', 'descricao',
  'endereco', 'foto_url', 'status', 'secretaria', 'prioridade', 'sla_limite',
  'observacoes_internas', 'resposta_cidadao', 'latitude', 'longitude', 'cidadao_id',
  'coordenador_id', 'na_secretaria_em', 'encaminhado_em', 'iniciado_em', 'executado_em',
  'concluido_em', 'visualizado_em', 'foto_execucao_url', 'respondido_em', 'cobrado_em', 'cobrancas',
  'created_at', 'updated_at',
].join(',');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gera um protocolo único no formato TRIN-<ano>-XXXXXX (ex: TRIN-2026-7B4K9X).
 * Usa gerador criptográfico e 6 caracteres (~887 milhões de combinações), para
 * que ninguém consiga adivinhar protocolos de outras pessoas na consulta pública.
 */
function gerarProtocoloTrindade(): string {
  // Caracteres alfanuméricos em maiúsculas, evitando caracteres confusos (0/O, 1/I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let sufixo = '';
  for (let i = 0; i < 6; i++) {
    sufixo += chars[randomInt(chars.length)];
  }
  return `TRIN-${new Date().getFullYear()}-${sufixo}`;
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

    // Localização opcional: só aceita pontos dentro de Trindade
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    const temLocalizacao =
      body.latitude != null && body.longitude != null && Number.isFinite(lat) && Number.isFinite(lng);
    if (temLocalizacao && !isWithinTrindade(lat, lng)) {
      return NextResponse.json(
        { success: false, error: 'A localização informada fica fora de Trindade.' },
        { status: 400 }
      );
    }

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

    // 4. Geração do protocolo único no formato TRIN-<ano>-XXXXXX
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
        // Sem .select() depois do insert: o visitante pode criar o chamado,
        // mas não tem permissão de leitura na tabela (proteção dos dados pessoais).
        // Logado: grava com a sessão da pessoa e liga o chamado à conta
        // (o banco confere que cidadao_id é a própria pessoa).
        const usuario = await usuarioOpcional(req);
        const cliente = usuario?.client ?? supabase;
        const { error: dbError } = await (cliente.from('chamados') as any).insert({
          cidadao_id: usuario?.userId ?? null,
          id: novoChamado.id,
          protocolo: novoChamado.protocolo,
          nome_cidadao: novoChamado.nome_cidadao,
          cpf_cidadao: novoChamado.cpf_cidadao,
          telefone_cidadao: novoChamado.telefone_cidadao,
          categoria_servico: novoChamado.categoria_servico,
          descricao: novoChamado.descricao,
          endereco: novoChamado.endereco,
          foto_url: novoChamado.foto_url,
          latitude: temLocalizacao ? lat : null,
          longitude: temLocalizacao ? lng : null,
          status: novoChamado.status,
          created_at: novoChamado.created_at,
          updated_at: novoChamado.updated_at,
        });

        if (dbError) {
          console.error('[API Chamados] Erro ao inserir no Supabase:', dbError);
          return NextResponse.json(
            {
              success: false,
              error: 'Erro de comunicação com o banco de dados ao salvar a solicitação.',
            },
            { status: 500 }
          );
        }

        const registroCriado = novoChamado;

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
 *  - ?protocolo=... ou ?cpf=...  → consulta pública (dados não sensíveis)
 *  - sem filtros                  → listagem completa, só para servidores logados
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const termoPublico = searchParams.get('protocolo') || searchParams.get('cpf');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    if (termoPublico) {
      const busca = normalizarTermoBusca(termoPublico);
      if (!busca) {
        return NextResponse.json(
          { success: false, error: 'Informe um protocolo válido ou um CPF completo com 11 dígitos.' },
          { status: 400 }
        );
      }
      const chamados = await buscarChamadosPublico(busca);
      if (chamados.length === 0) {
        return NextResponse.json({ success: false, error: 'Chamado não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, chamado: chamados[0], chamados }, { status: 200 });
    }

    // Listagem geral: contém CPF e telefone, então exige servidor municipal.
    const auth = await requireStaff(req);
    if ('response' in auth) return auth.response;

    if (auth.client) {
      const { data, error } = await (auth.client.from('chamados') as any)
        .select(COLUNAS_PAINEL)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[API Chamados] Erro ao listar chamados:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar chamados.' }, { status: 500 });
      }

      return NextResponse.json(
        { success: true, total: (data || []).length, chamados: data || [] },
        { status: 200 }
      );
    }

    const store = getSharedChamadosMemory();
    return NextResponse.json({ success: true, total: store.length, chamados: store }, { status: 200 });
  } catch (err: any) {
    console.error('[API Chamados] Erro ao buscar chamados:', err);
    return NextResponse.json({ success: false, error: 'Erro ao buscar chamados.' }, { status: 500 });
  }
}

const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];

/** Texto opcional: string aparada (vazia vira null) com limite de tamanho. */
function textoOpcional(valor: unknown, max: number): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  const t = String(valor).trim();
  return t ? t.slice(0, max) : null;
}

/**
 * PATCH /api/chamados
 * Atualiza status e campos de gestão de um chamado. Restrito a servidores.
 * Só altera os campos enviados no corpo.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireStaff(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { id, protocolo } = body || {};

    if (!id && !protocolo) {
      return NextResponse.json(
        { success: false, error: 'ID ou Protocolo do chamado é obrigatório para atualização.' },
        { status: 400 }
      );
    }

    const alteracoes: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!STATUS_VALIDOS.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `Status inválido. Use um destes: ${STATUS_VALIDOS.join(', ')}.` },
          { status: 400 }
        );
      }
      alteracoes.status = body.status;
    }

    if (body.prioridade !== undefined) {
      if (!PRIORIDADES.includes(body.prioridade)) {
        return NextResponse.json({ success: false, error: 'Prioridade inválida.' }, { status: 400 });
      }
      alteracoes.prioridade = body.prioridade;
    }

    if (body.sla_limite !== undefined) {
      if (body.sla_limite === null || body.sla_limite === '') {
        alteracoes.sla_limite = null;
      } else if (Number.isNaN(Date.parse(body.sla_limite))) {
        return NextResponse.json({ success: false, error: 'Prazo inválido.' }, { status: 400 });
      } else {
        alteracoes.sla_limite = new Date(body.sla_limite).toISOString();
      }
    }

    const secretaria = textoOpcional(body.secretaria, 50);
    if (secretaria !== undefined) alteracoes.secretaria = secretaria;
    const observacoes = textoOpcional(body.observacoes_internas ?? body.observacao, 2000);
    if (observacoes !== undefined) alteracoes.observacoes_internas = observacoes;
    const resposta = textoOpcional(body.resposta_cidadao, 2000);
    if (resposta !== undefined) alteracoes.resposta_cidadao = resposta;

    // Coordenador responsável. O banco confere se é mesmo um coordenador ativo.
    if (body.coordenador_id !== undefined) {
      if (body.coordenador_id === null || body.coordenador_id === '') {
        alteracoes.coordenador_id = null;
      } else if (
        typeof body.coordenador_id === 'string' &&
        // Banco real: id do Supabase (UUID). Demonstração: ids de exemplo.
        (isSupabaseConfigured ? UUID_RE.test(body.coordenador_id) : /^[\w-]{1,64}$/.test(body.coordenador_id))
      ) {
        alteracoes.coordenador_id = body.coordenador_id;
      } else {
        return NextResponse.json({ success: false, error: 'Coordenador inválido.' }, { status: 400 });
      }
    }

    // Motivo/observação desta ação (ex.: motivo do cancelamento). Vai para o
    // histórico da O.S.; o gatilho do banco limpa o campo depois.
    const motivo = textoOpcional(body.motivo, 500);
    if (motivo) alteracoes.motivo_acao = motivo;
    if (alteracoes.status === 'Cancelado' && !motivo) {
      return NextResponse.json({ success: false, error: 'Informe o motivo do cancelamento.' }, { status: 400 });
    }

    if (Object.keys(alteracoes).length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma alteração enviada.' }, { status: 400 });
    }

    // Atualização no Supabase, com a sessão do servidor (as regras de RLS valem aqui)
    if (auth.client) {
      let query = (auth.client.from('chamados') as any).update(alteracoes);
      query = id ? query.eq('id', id) : query.eq('protocolo', protocolo);

      const { data, error } = await query.select(COLUNAS_PAINEL).maybeSingle();

      if (error) {
        // Regras do fluxo recusadas pelo gatilho (RAISE EXCEPTION → P0001):
        // a mensagem já é escrita para a equipe ler.
        if (error.code === 'P0001') {
          return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        console.error('[API Chamados] Erro ao atualizar chamado no Supabase:', error);
        return NextResponse.json(
          { success: false, error: 'Erro ao atualizar o chamado no banco de dados.' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json({ success: false, error: 'Chamado não encontrado.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Chamado atualizado.', chamado: data }, { status: 200 });
    }

    // Modo demonstração (memória do servidor)
    const atualizado = alteracoes.status
      ? updateSharedChamadoStatus(protocolo || id, alteracoes.status as StatusChamado, observacoes ?? undefined)
      : null;

    return NextResponse.json(
      {
        success: true,
        message: 'Chamado atualizado. (Modo Demonstração)',
        chamado: atualizado || { id, protocolo, ...alteracoes },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[API Chamados] Erro inesperado no PATCH:', err);
    return NextResponse.json({ success: false, error: 'Erro ao processar atualização.' }, { status: 500 });
  }
}
