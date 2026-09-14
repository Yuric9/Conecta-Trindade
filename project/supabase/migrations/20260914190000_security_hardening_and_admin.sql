/*
  Conecta Trindade - hardening de segurança e administração

  Objetivos:
  - Nunca aceitar role vindo do cadastro público.
  - Impedir cidadão de promover a própria conta para admin.
  - Centralizar a verificação de administrador em função SECURITY DEFINER.
  - Restringir alterações de chamados feitas por cidadãos.
  - Permitir administração de roles somente por administrador.
  - Tornar a geração de protocolo atômica.
  - Colocar a regra de duplicidade no banco, não apenas no navegador.
  - Restringir Storage à pasta do próprio usuário/admin.
*/

-- ============================================================
-- HELPERS DE ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- PROFILE: ROLE CONTROLADO PELO BANCO
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente um administrador pode alterar a função do usuário';
  END IF;

  IF NEW.role NOT IN ('cidadao', 'admin') THEN
    RAISE EXCEPTION 'Função de usuário inválida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role();

-- O cadastro público SEMPRE cria cidadão.
-- O campo role enviado pelo navegador é deliberadamente ignorado.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, cpf, telefone, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    NEW.raw_user_meta_data->>'telefone',
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'cidadao'
  );
  RETURN NEW;
END;
$$;

-- Substitui políticas que consultavam profiles diretamente e poderiam
-- causar recursão de RLS.
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND role = 'cidadao');

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- ============================================================
-- CHAMADOS: ADMIN CHECK CENTRALIZADO + ALTERAÇÕES CONTROLADAS
-- ============================================================

DROP POLICY IF EXISTS "select_own_chamados" ON public.chamados;
CREATE POLICY "select_own_chamados" ON public.chamados
FOR SELECT TO authenticated
USING (auth.uid() = cidadao_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_chamados" ON public.chamados;
CREATE POLICY "insert_own_chamados" ON public.chamados
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = cidadao_id);

DROP POLICY IF EXISTS "update_own_chamados" ON public.chamados;
CREATE POLICY "update_own_chamados" ON public.chamados
FOR UPDATE TO authenticated
USING (auth.uid() = cidadao_id OR public.is_admin())
WITH CHECK (auth.uid() = cidadao_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_chamados" ON public.chamados;
CREATE POLICY "delete_own_chamados" ON public.chamados
FOR DELETE TO authenticated
USING (public.is_admin() OR (auth.uid() = cidadao_id AND status = 'ABERTO'));

CREATE OR REPLACE FUNCTION public.protect_cidadao_chamado_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.cidadao_id IS DISTINCT FROM NEW.cidadao_id
     OR OLD.protocolo IS DISTINCT FROM NEW.protocolo
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.secretaria IS DISTINCT FROM NEW.secretaria
     OR OLD.sla_limite IS DISTINCT FROM NEW.sla_limite
     OR OLD.categoria IS DISTINCT FROM NEW.categoria
     OR OLD.latitude IS DISTINCT FROM NEW.latitude
     OR OLD.longitude IS DISTINCT FROM NEW.longitude
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cidadão não pode alterar campos administrativos do chamado';
  END IF;

  IF OLD.status <> 'ABERTO' THEN
    RAISE EXCEPTION 'Chamado só pode ser editado pelo cidadão enquanto estiver ABERTO';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_cidadao_chamado_update ON public.chamados;
CREATE TRIGGER trg_protect_cidadao_chamado_update
BEFORE UPDATE ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.protect_cidadao_chamado_update();

-- ============================================================
-- PROTOCOLO ATÔMICO
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.chamados_protocolo_seq;

DO $$
DECLARE
  current_max bigint;
BEGIN
  SELECT COALESCE(MAX((regexp_match(protocolo, '-([0-9]+)$'))[1]::bigint), 0)
  INTO current_max
  FROM public.chamados;

  IF current_max = 0 THEN
    PERFORM setval('public.chamados_protocolo_seq', 1, false);
  ELSE
    PERFORM setval('public.chamados_protocolo_seq', current_max, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq bigint;
BEGIN
  next_seq := nextval('public.chamados_protocolo_seq');
  NEW.protocolo := 'TRIN-' || to_char(COALESCE(NEW.created_at, now()), 'YYYY') || '-' || lpad(next_seq::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_protocolo ON public.chamados;
CREATE TRIGGER trg_generate_protocolo
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.generate_protocolo();

-- ============================================================
-- DUPLICIDADE NO BANCO
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_duplicate_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_found boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.chamados c
    WHERE c.cidadao_id = NEW.cidadao_id
      AND c.created_at >= now() - interval '24 hours'
      AND 6371000 * 2 * asin(
        sqrt(
          power(sin(radians(c.latitude - NEW.latitude) / 2), 2) +
          cos(radians(NEW.latitude)) * cos(radians(c.latitude)) *
          power(sin(radians(c.longitude - NEW.longitude) / 2), 2)
        )
      ) < 100
  ) INTO duplicate_found;

  IF duplicate_found THEN
    RAISE EXCEPTION 'Já existe um chamado deste cidadão a menos de 100 metros aberto nas últimas 24 horas';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_duplicate_chamado ON public.chamados;
CREATE TRIGGER trg_check_duplicate_chamado
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_chamado();

-- ============================================================
-- ADMINISTRAÇÃO DE ROLES
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar funções de usuários';
  END IF;

  IF new_role NOT IN ('cidadao', 'admin') THEN
    RAISE EXCEPTION 'Função inválida';
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- ============================================================
-- STORAGE: pasta obrigatória = ID do usuário
-- ============================================================

DROP POLICY IF EXISTS "storage_select_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_select_chamados_fotos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chamados-fotos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);

DROP POLICY IF EXISTS "storage_insert_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_insert_chamados_fotos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chamados-fotos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_update_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_update_chamados_fotos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'chamados-fotos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'chamados-fotos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);

DROP POLICY IF EXISTS "storage_delete_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_delete_chamados_fotos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chamados-fotos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);

-- O bucket deixa de ser público. A aplicação deve usar caminhos autenticados.
UPDATE storage.buckets
SET public = false
WHERE id = 'chamados-fotos';
