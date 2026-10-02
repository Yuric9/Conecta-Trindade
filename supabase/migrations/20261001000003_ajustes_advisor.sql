-- Ajustes apontados pelo Security Advisor do Supabase.
--
-- O Supabase concede EXECUTE em funções novas diretamente aos papéis
-- anon/authenticated, então "REVOKE ... FROM PUBLIC" não basta.

-- Funções sem search_path fixo podem ser enganadas por objetos de outro schema.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.gerar_protocolo_chamado() SET search_path = public;

-- Funções de gatilho não precisam ser chamáveis pela API (/rest/v1/rpc).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

-- Usadas pelas políticas de RLS de usuários logados; visitantes não precisam.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;

-- consultar_chamados_publico() continua liberada para anon de propósito:
-- é a consulta pública por protocolo/CPF e devolve só dados não sensíveis.
