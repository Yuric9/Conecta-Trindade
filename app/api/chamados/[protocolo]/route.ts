import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, type ChamadoRow } from '@/lib/supabase';
import { getSharedChamadosMemory } from '@/lib/chamados-memory';

/**
 * Validação e higienização básica de CPF
 */
function limparCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * GET /api/chamados/[protocolo]
 * Busca a solicitação municipal no banco de dados por número de protocolo ou CPF do cidadão.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { protocolo: string } | Promise<{ protocolo: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawParam = resolvedParams?.protocolo;

    if (!rawParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetro de busca não informado. Forneça o número do protocolo ou CPF.',
        },
        { status: 400 }
      );
    }

    const termo = decodeURIComponent(rawParam).trim();
    const termoLimpo = termo.toLowerCase();
    const cleanDigits = limparCpf(termo);
    const isCpfSearch = cleanDigits.length >= 10;

    // 1. Consulta no banco de dados Supabase (caso configurado)
    if (isSupabaseConfigured) {
      try {
        let query = (supabase.from('chamados') as any).select('*');

        if (isCpfSearch) {
          // Busca por CPF ou Protocolo
          query = query.or(
            `protocolo.ilike.${termo},cpf_cidadao.eq.${termo},cpf_cidadao.ilike.%${cleanDigits}%`
          );
        } else {
          // Busca prioritária por número de protocolo único ou ID
          query = query.or(`protocolo.ilike.${termo},id.eq.${termo}`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('[API Chamados/[protocolo]] Erro na consulta Supabase:', error);
          return NextResponse.json(
            {
              success: false,
              error: 'Erro ao consultar o banco de dados Supabase.',
              mensagem_banco: error.message,
            },
            { status: 500 }
          );
        }

        if (data && data.length > 0) {
          return NextResponse.json(
            {
              success: true,
              total: data.length,
              chamado: data[0],
              chamados: data,
              termo_buscado: termo,
              origem: 'supabase',
            },
            { status: 200 }
          );
        }
      } catch (dbErr: any) {
        console.error('[API Chamados/[protocolo]] Exceção Supabase:', dbErr);
      }
    }

    // 2. Consulta no Armazenamento de Memória Compartilhado (Fallback e Demonstração)
    const store = getSharedChamadosMemory();

    // Tenta correspondência exata por protocolo ou ID
    let matches: ChamadoRow[] = store.filter(
      (c) =>
        c.protocolo.toLowerCase() === termoLimpo ||
        c.id.toLowerCase() === termoLimpo ||
        c.protocolo.toLowerCase().replace(/[^a-z0-9]/g, '') === termoLimpo.replace(/[^a-z0-9]/g, '')
    );

    // Se não encontrou por protocolo e o termo parecer CPF, busca por CPF
    if (matches.length === 0 && cleanDigits.length >= 8) {
      matches = store.filter((c) => {
        const cpfDigitos = limparCpf(c.cpf_cidadao || '');
        return cpfDigitos.includes(cleanDigits) || cleanDigits.includes(cpfDigitos);
      });
    }

    if (matches.length > 0) {
      return NextResponse.json(
        {
          success: true,
          total: matches.length,
          chamado: matches[0],
          chamados: matches,
          termo_buscado: termo,
          origem: 'local_memory',
        },
        { status: 200 }
      );
    }

    // Nenhuma solicitação encontrada
    return NextResponse.json(
      {
        success: false,
        error: `Nenhuma solicitação encontrada para "${termo}". Verifique se o protocolo ou CPF foi digitado corretamente.`,
        termo_buscado: termo,
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[API Chamados/[protocolo]] Erro inesperado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno no servidor ao buscar chamado.',
        detalhes: error?.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
