/**
 * Cliente do Supabase com a chave secreta (service role). SÓ NO SERVIDOR:
 * importe apenas em rotas de API (app/api), nunca em componentes.
 *
 * Usado para o que o navegador não pode fazer, como criar a conta de login
 * de um servidor municipal. A chave fica na variável de ambiente
 * SUPABASE_SERVICE_ROLE_KEY (Vercel → Settings → Environment Variables),
 * nunca no código nem com prefixo NEXT_PUBLIC_ (que iria para o navegador).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function clienteAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
