import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/supabase/server-auth';
import { clienteAdminSupabase } from '@/lib/supabase/server-admin';
import { CATEGORIAS } from '@/lib/types';

const FUNCOES = ['admin', 'gestor', 'fiscal', 'atendente', 'coordenador', 'cidadao'];
const LOTACOES = ['INFRAESTRUTURA', 'TODAS'];
const SERVICOS_VALIDOS = CATEGORIAS.map((c) => c.id as string);

function erro(status: number, mensagem: string) {
  return NextResponse.json({ success: false, error: mensagem }, { status });
}

function texto(valor: unknown, max: number): string | null {
  const t = typeof valor === 'string' ? valor.trim() : '';
  return t ? t.slice(0, max) : null;
}

/**
 * POST /api/usuarios
 * Cria a conta de login (e-mail + senha) de um servidor e já define a função,
 * a lotação e os serviços. Só o administrador pode usar.
 *
 * O navegador não consegue criar conta para outra pessoa: isso exige a chave
 * secreta do Supabase, que fica só no servidor (SUPABASE_SERVICE_ROLE_KEY).
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, { adminOnly: true });
  if ('response' in auth) return auth.response;

  const admin = clienteAdminSupabase();
  if (!admin) {
    return erro(
      503,
      'O cadastro de servidores ainda não está configurado: falta a variável SUPABASE_SERVICE_ROLE_KEY na Vercel.'
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return erro(400, 'Dados inválidos.');
  }

  const nome = texto(body?.nome, 120);
  const email = texto(body?.email, 160)?.toLowerCase() ?? null;
  const senha = typeof body?.senha === 'string' ? body.senha : '';
  const role = typeof body?.role === 'string' ? body.role : '';
  const secretaria = body?.secretaria ? String(body.secretaria) : null;
  const servicos: string[] = Array.isArray(body?.servicos) ? body.servicos.map(String) : [];

  if (!nome || nome.length < 3) return erro(400, 'Informe o nome completo.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro(400, 'E-mail inválido.');
  if (senha.length < 8) return erro(400, 'A senha precisa ter pelo menos 8 caracteres.');
  if (!FUNCOES.includes(role)) return erro(400, 'Função inválida.');
  if (secretaria && !LOTACOES.includes(secretaria)) return erro(400, 'Lotação inválida.');
  if (servicos.some((s) => !SERVICOS_VALIDOS.includes(s))) return erro(400, 'Serviço inválido.');
  if (role === 'coordenador' && servicos.length === 0) return erro(400, 'Marque os serviços do coordenador.');

  const telefone = texto(body?.telefone, 30);
  const cpf = texto(body?.cpf, 20);

  // 1. Conta de login (já confirmada: quem cadastra é o admin)
  const { data: criado, error: erroConta } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, cpf, telefone },
  });

  if (erroConta || !criado?.user) {
    const msg = erroConta?.message || '';
    if (/already|registered|exists/i.test(msg)) return erro(409, 'Já existe uma conta com este e-mail.');
    if (/password/i.test(msg)) return erro(400, 'Senha fraca: use letras e números, com pelo menos 8 caracteres.');
    console.error('[API Usuarios] Erro ao criar conta:', erroConta);
    return erro(500, 'Não foi possível criar a conta.');
  }

  // 2. Perfil: o gatilho do banco cria como cidadão; aqui define a função
  const perfil = {
    nome,
    telefone,
    cpf,
    role,
    secretaria,
    cargo: texto(body?.cargo, 120),
    servicos: role === 'coordenador' ? servicos : [],
    status: 'ativo',
    updated_at: new Date().toISOString(),
  };
  const { data: salvo, error: erroPerfil } = await (admin.from('profiles') as any)
    .update(perfil)
    .eq('id', criado.user.id)
    .select('*')
    .maybeSingle();

  if (erroPerfil || !salvo) {
    // Não deixa conta "pela metade": desfaz a criação
    console.error('[API Usuarios] Erro ao salvar perfil:', erroPerfil);
    await admin.auth.admin.deleteUser(criado.user.id);
    return erro(500, 'Não foi possível salvar o perfil do usuário.');
  }

  return NextResponse.json({ success: true, profile: salvo }, { status: 201 });
}
