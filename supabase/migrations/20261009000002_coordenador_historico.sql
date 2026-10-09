-- =====================================================================
-- Conecta Trindade - coordenadores e histórico da O.S. (parte 2 de 2)
-- =====================================================================
-- 1. Nova função de usuário "coordenador", com os serviços que ele atende.
-- 2. A O.S. passa a ter um coordenador responsável e a data de cada etapa.
-- 3. Histórico: toda troca de status ou de coordenador fica registrada com
--    data, hora e quem fez. É o que permite cobrar o coordenador.
--
-- As regras ficam no banco (gatilho), não só na tela: valem para qualquer
-- caminho que altere a O.S.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coordenador
-- ---------------------------------------------------------------------

-- Serviços que o coordenador atende (ids de categoria: ILUMINACAO, BURACO...).
-- Um coordenador pode acumular vários.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS servicos TEXT[] NOT NULL DEFAULT '{}';

-- Mesma regra de antes, com "coordenador" na lista de funções válidas.
-- Os serviços do coordenador também só podem ser mudados por um admin.
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
    IF TG_OP = 'INSERT' AND NEW.role <> 'cidadao' THEN
      RAISE EXCEPTION 'Cadastro público só pode criar cidadão';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Somente um administrador pode alterar a função do usuário';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.servicos IS DISTINCT FROM OLD.servicos THEN
      RAISE EXCEPTION 'Somente um administrador pode alterar os serviços do coordenador';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- O coordenador NÃO entra em is_staff(): ele não lê todas as O.S. nem os
-- dados pessoais completos. A tela dele (fase 2) terá acesso próprio.

-- ---------------------------------------------------------------------
-- 2. Campos do fluxo na O.S.
-- ---------------------------------------------------------------------
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS encaminhado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
  -- Motivo/observação da ação que está sendo feita agora (ex.: motivo do
  -- cancelamento). O gatilho copia para o histórico e limpa o campo.
  ADD COLUMN IF NOT EXISTS motivo_acao TEXT;

CREATE INDEX IF NOT EXISTS idx_chamados_coordenador_id ON public.chamados(coordenador_id);

-- "Em Análise" sai do fluxo: o que estava nele volta a ser O.S. nova.
UPDATE public.chamados SET status = 'Pendente' WHERE status = 'Em Análise';

-- O cidadão abre o chamado, mas não preenche campos da equipe.
ALTER POLICY "chamados_insert_publico" ON public.chamados
  WITH CHECK (
    status = 'Pendente'
    AND prioridade = 'MEDIA'
    AND secretaria IS NULL
    AND sla_limite IS NULL
    AND observacoes_internas IS NULL
    AND resposta_cidadao IS NULL
    AND coordenador_id IS NULL
    AND encaminhado_em IS NULL
    AND iniciado_em IS NULL
    AND executado_em IS NULL
    AND concluido_em IS NULL
    AND motivo_acao IS NULL
    AND (cidadao_id IS NULL OR cidadao_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 3. Histórico da O.S.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamado_historico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT,
  coordenador_id UUID,
  coordenador_nome TEXT,
  detalhe TEXT,
  autor_id UUID,
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamado_historico_chamado
  ON public.chamado_historico(chamado_id, created_at);

-- Só servidores leem. Ninguém grava direto: só o gatilho (SECURITY DEFINER),
-- então o histórico não pode ser editado nem apagado pelo aplicativo.
ALTER TABLE public.chamado_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chamado_historico_select_servidores" ON public.chamado_historico;
CREATE POLICY "chamado_historico_select_servidores" ON public.chamado_historico
  FOR SELECT TO authenticated
  USING (public.is_staff());

REVOKE ALL ON public.chamado_historico FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.chamado_historico FROM authenticated;
GRANT SELECT ON public.chamado_historico TO authenticated;

-- Registro de quem abriu (vale também para os chamados que já existem).
INSERT INTO public.chamado_historico (chamado_id, status_novo, detalhe, autor_nome, created_at)
SELECT c.id, 'Pendente', 'Chamado aberto', c.nome_cidadao, c.created_at
FROM public.chamados c
WHERE NOT EXISTS (SELECT 1 FROM public.chamado_historico h WHERE h.chamado_id = c.id);

CREATE OR REPLACE FUNCTION public.chamado_historico_abertura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chamado_historico (chamado_id, status_novo, detalhe, autor_id, autor_nome)
  VALUES (NEW.id, NEW.status::text, 'Chamado aberto', auth.uid(), NEW.nome_cidadao);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamados_historico_abertura ON public.chamados;
CREATE TRIGGER trg_chamados_historico_abertura
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.chamado_historico_abertura();

-- ---------------------------------------------------------------------
-- 4. Regras do fluxo + registro no histórico (a cada alteração)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chamado_fluxo_os()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mudou_status BOOLEAN := NEW.status IS DISTINCT FROM OLD.status;
  mudou_coordenador BOOLEAN := NEW.coordenador_id IS DISTINCT FROM OLD.coordenador_id;
  motivo TEXT := NULLIF(trim(COALESCE(NEW.motivo_acao, '')), '');
  nome_coordenador TEXT;
  nome_autor TEXT;
BEGIN
  -- Só um coordenador ativo pode receber O.S.
  IF mudou_coordenador AND NEW.coordenador_id IS NOT NULL THEN
    SELECT nome INTO nome_coordenador
    FROM public.profiles
    WHERE id = NEW.coordenador_id AND role = 'coordenador' AND COALESCE(status, 'ativo') = 'ativo';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O responsável escolhido não é um coordenador ativo';
    END IF;
  END IF;

  IF mudou_status THEN
    IF NEW.status IN ('Encaminhada', 'Em Andamento', 'Aguardando Confirmação')
       AND NEW.coordenador_id IS NULL THEN
      RAISE EXCEPTION 'Escolha o coordenador responsável antes de encaminhar a O.S.';
    END IF;
    IF NEW.status = 'Cancelado' AND motivo IS NULL THEN
      RAISE EXCEPTION 'Informe o motivo do cancelamento';
    END IF;

    -- Data de cada etapa (usada para medir prazo e cobrar)
    CASE NEW.status
      WHEN 'Encaminhada' THEN NEW.encaminhado_em := now();
      WHEN 'Em Andamento' THEN NEW.iniciado_em := COALESCE(NEW.iniciado_em, now());
      WHEN 'Aguardando Confirmação' THEN NEW.executado_em := now();
      WHEN 'Concluído' THEN NEW.concluido_em := now();
      ELSE NULL;
    END CASE;
    -- O.S. reaberta deixa de contar como concluída
    IF OLD.status = 'Concluído' AND NEW.status <> 'Concluído' THEN
      NEW.concluido_em := NULL;
    END IF;
  ELSIF mudou_coordenador AND NEW.coordenador_id IS NOT NULL THEN
    -- Repassada a outro coordenador sem mudar o status: o prazo de
    -- resposta dele começa agora.
    NEW.encaminhado_em := now();
  END IF;

  IF mudou_status OR mudou_coordenador OR motivo IS NOT NULL THEN
    SELECT nome INTO nome_autor FROM public.profiles WHERE id = auth.uid();
    IF nome_coordenador IS NULL AND mudou_coordenador AND NEW.coordenador_id IS NULL THEN
      nome_coordenador := '(sem coordenador)';
    END IF;

    INSERT INTO public.chamado_historico (
      chamado_id, status_anterior, status_novo, coordenador_id, coordenador_nome,
      detalhe, autor_id, autor_nome
    ) VALUES (
      NEW.id,
      CASE WHEN mudou_status THEN OLD.status::text END,
      CASE WHEN mudou_status THEN NEW.status::text END,
      CASE WHEN mudou_coordenador THEN NEW.coordenador_id END,
      CASE WHEN mudou_coordenador THEN nome_coordenador END,
      motivo,
      auth.uid(),
      nome_autor
    );
  END IF;

  NEW.motivo_acao := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamados_fluxo_os ON public.chamados;
CREATE TRIGGER trg_chamados_fluxo_os
BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.chamado_fluxo_os();

-- Funções de gatilho não precisam ser chamáveis pela API (/rest/v1/rpc).
REVOKE EXECUTE ON FUNCTION public.chamado_historico_abertura() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.chamado_fluxo_os() FROM PUBLIC, anon, authenticated;
