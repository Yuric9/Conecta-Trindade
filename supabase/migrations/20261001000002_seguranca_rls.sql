-- =====================================================================
-- Conecta Trindade - Reforço de segurança (RLS)
-- =====================================================================
-- Problemas corrigidos:
--   1. Qualquer visitante lia TODOS os chamados (nome, CPF, telefone,
--      endereço), pois a policy de SELECT era USING (true). Isso viola a LGPD.
--   2. A view "solicitacoes" ignorava o RLS (views rodam com as permissões
--      do dono por padrão).
--   3. Qualquer usuário logado (inclusive cidadão) podia alterar ou apagar
--      chamados, já que a regra era só auth.role() = 'authenticated'.
--   4. Qualquer visitante podia alterar a configuração do portal.
--   5. A função (role) do usuário não era protegida contra auto-promoção.
--
-- A consulta pública por protocolo/CPF passa a ser feita pela função
-- consultar_chamados_publico(), que devolve só campos não sensíveis.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Converte registros gravados com o valor antigo 'EM_ANALISE'
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'status_chamado' AND e.enumlabel = 'EM_ANALISE'
  ) THEN
    UPDATE public.chamados SET status = 'Em Análise' WHERE status::text = 'EM_ANALISE';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Perfis de usuário
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT NOT NULL DEFAULT '',
  cpf TEXT,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'cidadao',
  secretaria TEXT,
  cargo TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Funções auxiliares de permissão
--    SECURITY DEFINER evita recursão de RLS ao consultar profiles.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Servidores municipais: admin, gestor, fiscal e atendente.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'gestor', 'fiscal', 'atendente')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Cadastro público SEMPRE cria cidadão (role do navegador é ignorado)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, cpf, telefone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'telefone',
    'cidadao'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Só um admin pode mudar a função (role) de alguém.
-- Exceção: SQL Editor / service_role (auth.uid() nulo), usado para criar
-- o primeiro administrador.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('admin', 'gestor', 'fiscal', 'atendente', 'cidadao') THEN
    RAISE EXCEPTION 'Função de usuário inválida: %', NEW.role;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' AND NEW.role <> 'cidadao' THEN
      RAISE EXCEPTION 'Cadastro público só pode criar cidadão';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Somente um administrador pode alterar a função do usuário';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff());

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Chamados
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir inserção de chamados por qualquer usuário" ON public.chamados;
DROP POLICY IF EXISTS "Permitir leitura de chamados" ON public.chamados;
DROP POLICY IF EXISTS "Permitir atualização por administradores e fiscais" ON public.chamados;
DROP POLICY IF EXISTS "Permitir exclusão por administradores" ON public.chamados;

-- Qualquer pessoa abre chamado, mas sempre como 'Pendente'.
DROP POLICY IF EXISTS "chamados_insert_publico" ON public.chamados;
CREATE POLICY "chamados_insert_publico" ON public.chamados
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'Pendente');

-- Leitura completa (com CPF/telefone) só para servidores.
DROP POLICY IF EXISTS "chamados_select_servidores" ON public.chamados;
CREATE POLICY "chamados_select_servidores" ON public.chamados
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "chamados_update_servidores" ON public.chamados;
CREATE POLICY "chamados_update_servidores" ON public.chamados
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "chamados_delete_admin" ON public.chamados;
CREATE POLICY "chamados_delete_admin" ON public.chamados
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- O gatilho que gera protocolo (quando não informado) usa esta sequência.
GRANT USAGE ON SEQUENCE public.chamado_protocolo_seq TO anon, authenticated;

-- Os chamados de exemplo usam TRIN-2026-1001..1003, mas a sequência também
-- começava em 1001, então o primeiro protocolo automático colidia com eles.
SELECT setval(
  'public.chamado_protocolo_seq',
  GREATEST(
    (SELECT last_value FROM public.chamado_protocolo_seq),
    COALESCE((
      SELECT MAX((regexp_match(protocolo, '-([0-9]+)$'))[1]::bigint)
      FROM public.chamados
    ), 0)
  )
);

-- A view passa a respeitar o RLS de quem consulta (Postgres 15+).
ALTER VIEW IF EXISTS public.solicitacoes SET (security_invoker = true);

-- ---------------------------------------------------------------------
-- 5. Consulta pública por protocolo ou CPF
--    Busca exata (sem curingas) e sem devolver CPF, telefone ou nome completo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consultar_chamados_publico(termo TEXT)
RETURNS TABLE (
  id UUID,
  protocolo VARCHAR,
  primeiro_nome TEXT,
  categoria_servico VARCHAR,
  descricao TEXT,
  endereco TEXT,
  foto_url TEXT,
  status status_chamado,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.protocolo,
    split_part(c.nome_cidadao, ' ', 1),
    c.categoria_servico,
    c.descricao,
    c.endereco,
    c.foto_url,
    c.status,
    c.created_at,
    c.updated_at
  FROM public.chamados c
  WHERE
    upper(c.protocolo) = upper(trim(termo))
    OR (
      length(regexp_replace(termo, '\D', '', 'g')) = 11
      AND regexp_replace(c.cpf_cidadao, '\D', '', 'g') = regexp_replace(termo, '\D', '', 'g')
    )
  ORDER BY c.created_at DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamados_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamados_publico(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Configuração do portal: leitura pública, escrita só de admin
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir atualização da configuração do portal" ON public.portal_config;
DROP POLICY IF EXISTS "Permitir inserção da configuração do portal" ON public.portal_config;

DROP POLICY IF EXISTS "portal_config_update_admin" ON public.portal_config;
CREATE POLICY "portal_config_update_admin" ON public.portal_config
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "portal_config_insert_admin" ON public.portal_config;
CREATE POLICY "portal_config_insert_admin" ON public.portal_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
