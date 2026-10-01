import { supabase } from '@/lib/supabase/client';

/**
 * Cabeçalhos para chamar as rotas de API protegidas.
 * Envia o token da sessão atual para o servidor conferir quem está logado.
 */
export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Sem sessão: a rota responderá 401 se exigir login.
  }
  return headers;
}
