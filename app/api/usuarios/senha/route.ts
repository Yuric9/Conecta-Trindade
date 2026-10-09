import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/supabase/server-auth';
import { clienteAdminSupabase } from '@/lib/supabase/server-admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function erro(status: number, mensagem: string) {
  return NextResponse.json({ success: false, error: mensagem }, { status });
}

/**
 * POST /api/usuarios/senha
 * O admin define uma senha nova para uma conta da EQUIPE (atendente,
 * secretário, coordenador...), por exemplo quando o servidor não tem acesso
 * ao e-mail. Conta de cidadão não: o cidadão usa "Esqueci minha senha", e a
 * senha dele continua sendo só dele.
 *
 * A senha não é guardada nem devolvida aqui: vai direto para o Supabase,
 * que guarda só o hash.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, { adminOnly: true });
  if ('response' in auth) return auth.response;

  const admin = clienteAdminSupabase();
  if (!admin) {
    return erro(503, 'Falta a variável SUPABASE_SERVICE_ROLE_KEY na Vercel.');
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return erro(400, 'Dados inválidos.');
  }

  const id = typeof body?.id === 'string' ? body.id : '';
  const senha = typeof body?.senha === 'string' ? body.senha : '';
  if (!UUID_RE.test(id)) return erro(400, 'Usuário inválido.');
  if (senha.length < 8) return erro(400, 'A senha precisa ter pelo menos 8 caracteres.');

  const { data: perfil } = await (admin.from('profiles') as any).select('role').eq('id', id).maybeSingle();
  if (!perfil) return erro(404, 'Usuário não encontrado.');
  if (perfil.role === 'cidadao') {
    return erro(403, 'Conta de cidadão: peça para a pessoa usar "Esqueci minha senha" na tela de login.');
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) {
    if (/password/i.test(error.message)) return erro(400, 'Senha fraca: use letras e números, com pelo menos 8 caracteres.');
    console.error('[API Usuarios/senha] Erro ao trocar senha:', error);
    return erro(500, 'Não foi possível trocar a senha.');
  }

  return NextResponse.json({ success: true });
}
