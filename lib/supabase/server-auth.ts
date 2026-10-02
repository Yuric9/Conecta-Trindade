/**
 * Autenticação nas rotas de API (lado do servidor).
 *
 * O navegador envia o token da sessão no cabeçalho `Authorization: Bearer <token>`.
 * Aqui criamos um cliente Supabase "em nome" desse usuário, para que as regras
 * de RLS do banco valham também nas rotas de API, e conferimos o papel (role)
 * dele na tabela `profiles`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase';

const STAFF_ROLES = ['admin', 'gestor', 'fiscal', 'atendente'];

type AuthResult =
  | { ok: true; client: SupabaseClient | null; role: string | null }
  | { ok: false; response: NextResponse };

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function negar(status: number, error: string): AuthResult {
  return { ok: false, response: NextResponse.json({ success: false, error }, { status }) };
}

/**
 * Exige um servidor municipal logado (admin, gestor, fiscal ou atendente).
 * Com `adminOnly`, exige especificamente o papel de administrador.
 *
 * Em modo demonstração (sem Supabase configurado) não há banco real para
 * proteger, então a verificação é dispensada e `client` volta nulo.
 */
export async function requireStaff(
  req: NextRequest,
  { adminOnly = false }: { adminOnly?: boolean } = {}
): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { ok: true, client: null, role: null };
  }

  const token = getBearerToken(req);
  if (!token) {
    return negar(401, 'Faça login como servidor municipal para continuar.');
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return negar(401, 'Sessão inválida ou expirada. Faça login novamente.');
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role ?? null;
  const permitido = adminOnly ? role === 'admin' : role !== null && STAFF_ROLES.includes(role);

  if (!permitido) {
    return negar(403, 'Você não tem permissão para esta ação.');
  }

  return { ok: true, client, role };
}
