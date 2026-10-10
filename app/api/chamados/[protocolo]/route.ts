import { NextRequest, NextResponse } from 'next/server';
import { normalizarTermoBusca, buscarChamadosPublico, pareceCpf, MSG_SO_PROTOCOLO } from '@/lib/chamados-publico';

/**
 * GET /api/chamados/[protocolo]
 * Consulta pública de uma solicitação pelo número do protocolo (não aceita CPF).
 * Devolve apenas dados não sensíveis (sem CPF, telefone ou nome completo).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { protocolo: string } | Promise<{ protocolo: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const termo = decodeURIComponent(resolvedParams?.protocolo || '').trim();

    const busca = normalizarTermoBusca(termo);
    if (!busca) {
      return NextResponse.json(
        {
          success: false,
          error: pareceCpf(termo) ? MSG_SO_PROTOCOLO : 'Informe um protocolo válido (ex.: TRIN-2026-7B4K9X).',
        },
        { status: 400 }
      );
    }

    const chamados = await buscarChamadosPublico(busca);

    if (chamados.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhuma solicitação encontrada. Confira se o número do protocolo foi digitado corretamente.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        total: chamados.length,
        chamado: chamados[0],
        chamados,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Chamados/[protocolo]] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor ao buscar chamado.' },
      { status: 500 }
    );
  }
}
