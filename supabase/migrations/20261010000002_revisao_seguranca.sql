-- =====================================================================
-- Revisão de segurança (antes de divulgar o site)
--
-- 1. Usuário DESATIVADO perde o acesso no banco. Antes, is_staff() e
--    is_admin() olhavam só a função: um servidor desativado ainda lia
--    todas as O.S. (com nome e telefone dos cidadãos).
-- 2. Ninguém muda a própria lotação nem se reativa. Antes, uma atendente
--    da central podia trocar a própria lotação para INFRAESTRUTURA e
--    virar "Secretaria"; e um usuário desativado podia se reativar.
-- 3. Limites nos pedidos: tamanho dos textos e da foto, formato do CPF e
--    da foto, e trava contra enxurrada de pedidos (robô).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Só conta como equipe/admin quem está ativo
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
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(status, 'ativo') = 'ativo'
  );
$$;

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
      AND COALESCE(status, 'ativo') = 'ativo'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Campos de acesso só o admin muda
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('admin', 'gestor', 'fiscal', 'atendente', 'coordenador', 'cidadao') THEN
    RAISE EXCEPTION 'Função de usuário inválida: %', NEW.role;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role <> 'cidadao' THEN
        RAISE EXCEPTION 'Cadastro público só pode criar cidadão';
      END IF;
      IF NEW.secretaria IS NOT NULL OR COALESCE(array_length(NEW.servicos, 1), 0) > 0 THEN
        RAISE EXCEPTION 'Cadastro público não define lotação nem serviços';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Somente um administrador pode alterar a função do usuário';
      END IF;
      IF NEW.servicos IS DISTINCT FROM OLD.servicos THEN
        RAISE EXCEPTION 'Somente um administrador pode alterar os serviços do coordenador';
      END IF;
      IF NEW.secretaria IS DISTINCT FROM OLD.secretaria THEN
        RAISE EXCEPTION 'Somente um administrador pode alterar a lotação';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Somente um administrador pode ativar ou desativar usuários';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 3a. Limites nos dados do pedido
-- ---------------------------------------------------------------------
ALTER TABLE public.chamados
  ADD CONSTRAINT chamados_cpf_formato
    CHECK (regexp_replace(cpf_cidadao, '\D', '', 'g') ~ '^\d{11}$'),
  ADD CONSTRAINT chamados_textos_tamanho
    CHECK (
      length(nome_cidadao) <= 150
      AND length(COALESCE(telefone_cidadao, '')) <= 40
      AND length(COALESCE(endereco, '')) <= 500
      AND length(COALESCE(descricao, '')) <= 3000
      AND length(COALESCE(resposta_cidadao, '')) <= 2000
      AND length(COALESCE(observacoes_internas, '')) <= 5000
    ),
  -- Foto: imagem no próprio pedido (até ~2 MB) ou link https
  ADD CONSTRAINT chamados_foto_formato
    CHECK (
      foto_url IS NULL
      OR (foto_url ~ '^(data:image/(jpeg|png|webp);base64,|https://)' AND length(foto_url) <= 3000000)
    );

-- ---------------------------------------------------------------------
-- 3b. Trava contra enxurrada de pedidos (vale para o site e para quem
--     tentar gravar direto na API do banco)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chamados_created_at ON public.chamados(created_at DESC);

CREATE OR REPLACE FUNCTION public.chamado_limite_envio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_limpo TEXT := regexp_replace(COALESCE(NEW.cpf_cidadao, ''), '\D', '', 'g');
BEGIN
  -- A equipe registrando pedidos recebidos por telefone/balcão não tem limite
  IF public.is_staff() THEN
    RETURN NEW;
  END IF;

  -- A data do pedido é a do servidor (ninguém "volta no tempo" para fugir do limite)
  NEW.created_at := now();
  NEW.updated_at := now();

  -- Mesma pessoa: até 5 pedidos por hora
  IF (
    SELECT count(*) FROM public.chamados c
    WHERE c.created_at > now() - interval '1 hour'
      AND regexp_replace(c.cpf_cidadao, '\D', '', 'g') = cpf_limpo
  ) >= 5 THEN
    RAISE EXCEPTION 'Muitos pedidos com este CPF na última hora. Tente de novo mais tarde.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Site inteiro: até 40 pedidos a cada 10 minutos (acima disso é robô)
  IF (
    SELECT count(*) FROM public.chamados c
    WHERE c.created_at > now() - interval '10 minutes'
  ) >= 40 THEN
    RAISE EXCEPTION 'Muitos pedidos no momento. Tente de novo em alguns minutos.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.chamado_limite_envio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_chamados_limite_envio ON public.chamados;
CREATE TRIGGER trg_chamados_limite_envio
  BEFORE INSERT ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.chamado_limite_envio();
