import { NextRequest, NextResponse } from 'next/server';
import { usuarioOpcional } from '@/lib/supabase/server-auth';
import { clienteAdminSupabase } from '@/lib/supabase/server-admin';
import { enviarFoto } from '@/lib/fotos-os';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function erro(status: number, mensagem: string) {
  return NextResponse.json({ success: false, error: mensagem }, { status });
}

/**
 * POST /api/os/foto
 * O coordenador envia a foto do serviço feito ({ chamado_id, foto }).
 * O servidor confere que a O.S. é dele e está com ele, guarda a foto no
 * Storage e devolve o endereço; a tela grava esse endereço pela função
 * coordenador_atualizar_os (que confere tudo de novo no banco).
 */
export async function POST(req: NextRequest) {
  const admin = clienteAdminSupabase();
  if (!admin) return erro(503, 'Envio de fotos não configurado.');

  const usuario = await usuarioOpcional(req);
  if (!usuario) return erro(401, 'Faça login para enviar a foto.');

  let body: any;
  try {
    body = await req.json();
  } catch {
    return erro(400, 'Dados inválidos.');
  }
  const chamadoId = typeof body?.chamado_id === 'string' ? body.chamado_id : '';
  const foto = typeof body?.foto === 'string' ? body.foto : '';
  if (!UUID_RE.test(chamadoId)) return erro(400, 'O.S. inválida.');
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(foto) || foto.length > 3000000) {
    return erro(400, 'Foto inválida ou grande demais.');
  }

  // A O.S. precisa ser deste coordenador (ativo) e estar com ele
  const [{ data: os }, { data: perfil }] = await Promise.all([
    (admin.from('chamados') as any).select('coordenador_id, status').eq('id', chamadoId).maybeSingle(),
    (admin.from('profiles') as any).select('role, status').eq('id', usuario.userId).maybeSingle(),
  ]);
  const ehCoordenadorAtivo = perfil?.role === 'coordenador' && (perfil?.status ?? 'ativo') === 'ativo';
  if (!os || !ehCoordenadorAtivo || os.coordenador_id !== usuario.userId) {
    return erro(403, 'Esta O.S. não está com você.');
  }
  if (!['Encaminhada', 'Em Andamento'].includes(os.status)) {
    return erro(400, 'Esta O.S. não está em execução.');
  }

  try {
    const endereco = await enviarFoto(admin, chamadoId, 'execucao', foto);
    return NextResponse.json({ success: true, endereco });
  } catch (e) {
    console.error('[API OS/foto] Falha ao enviar foto:', e);
    return erro(500, 'Não foi possível enviar a foto. Tente de novo.');
  }
}
