-- =====================================================================
-- Conecta Trindade - a central fala com o cidadão
-- =====================================================================
-- 1. Resposta ao cidadão: só a central de atendimento (e o admin) escreve.
--    A Secretaria registra o que foi feito nas observações internas.
--    Quando a resposta é gravada, fica a data (respondido_em) e o registro
--    no histórico. A fila "Responder ao cidadão" são as O.S. concluídas ou
--    canceladas ainda sem resposta.
-- 2. Cobrança: quando o cidadão cobra, a central registra pela função
--    registrar_cobranca(). Vai para o histórico e a O.S. aparece "Cobrada"
--    para a Secretaria (cobrado_em, cobrancas).
-- =====================================================================

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS respondido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cobrado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cobrancas INTEGER NOT NULL DEFAULT 0;

-- Leitura por coluna (ver 20261009000006): colunas novas entram no GRANT
GRANT SELECT (respondido_em, cobrado_em, cobrancas) ON public.chamados TO authenticated;

ALTER POLICY "chamados_insert_publico" ON public.chamados
  WITH CHECK (
    status = 'Pendente'
    AND prioridade = 'MEDIA'
    AND secretaria IS NULL
    AND sla_limite IS NULL
    AND observacoes_internas IS NULL
    AND resposta_cidadao IS NULL
    AND coordenador_id IS NULL
    AND na_secretaria_em IS NULL
    AND encaminhado_em IS NULL
    AND iniciado_em IS NULL
    AND executado_em IS NULL
    AND concluido_em IS NULL
    AND motivo_acao IS NULL
    AND visualizado_em IS NULL
    AND foto_execucao_url IS NULL
    AND respondido_em IS NULL
    AND cobrado_em IS NULL
    AND cobrancas = 0
    AND (cidadao_id IS NULL OR cidadao_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- Regras do fluxo (substitui a versão de 20261009000005) + resposta
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chamado_fluxo_os()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  motivo TEXT := NULLIF(trim(COALESCE(NEW.motivo_acao, '')), '');
  -- "Em Análise" saiu do fluxo: vale como O.S. nova
  st_antes TEXT := CASE WHEN OLD.status::text = 'Em Análise' THEN 'Pendente' ELSE OLD.status::text END;
  st_depois TEXT;
  passo TEXT;
  papel TEXT;
  mudou_status BOOLEAN;
  mudou_coordenador BOOLEAN;
  mudou_resposta BOOLEAN := NEW.resposta_cidadao IS DISTINCT FROM OLD.resposta_cidadao;
  nome_coordenador TEXT;
  nome_autor TEXT;
BEGIN
  -- Na central e na Secretaria a O.S. ainda não tem coordenador
  IF NEW.status IN ('Pendente', 'Na Secretaria') AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.coordenador_id := NULL;
  END IF;

  mudou_status := NEW.status IS DISTINCT FROM OLD.status;
  mudou_coordenador := NEW.coordenador_id IS DISTINCT FROM OLD.coordenador_id;
  st_depois := NEW.status::text;
  passo := st_antes || ' > ' || st_depois;

  -- Quem pode fazer cada passo
  IF auth.uid() IS NOT NULL AND (mudou_status OR mudou_coordenador) THEN
    papel := public.papel_os(auth.uid());
    IF papel IS NULL THEN
      RAISE EXCEPTION 'Sua conta não tem permissão para alterar O.S.';
    END IF;

    IF papel <> 'admin' THEN
      IF mudou_status THEN
        IF papel = 'central' AND passo NOT IN (
          'Pendente > Na Secretaria',
          'Pendente > Cancelado'
        ) THEN
          RAISE EXCEPTION 'A central só envia a O.S. nova à Secretaria ou cancela';
        ELSIF papel = 'secretaria' AND passo NOT IN (
          'Na Secretaria > Encaminhada',
          'Na Secretaria > Pendente',
          'Encaminhada > Em Andamento',
          'Encaminhada > Aguardando Confirmação',
          'Em Andamento > Aguardando Confirmação',
          'Aguardando Confirmação > Concluído',
          'Aguardando Confirmação > Em Andamento',
          'Encaminhada > Na Secretaria',
          'Em Andamento > Na Secretaria'
        ) THEN
          RAISE EXCEPTION 'A Secretaria não pode mudar a O.S. de "%" para "%"', st_antes, st_depois;
        ELSIF papel = 'coordenador' AND passo NOT IN (
          'Encaminhada > Em Andamento',
          'Encaminhada > Aguardando Confirmação',
          'Em Andamento > Aguardando Confirmação',
          'Encaminhada > Na Secretaria',
          'Em Andamento > Na Secretaria'
        ) THEN
          RAISE EXCEPTION 'Ação não permitida ao coordenador';
        END IF;
      END IF;

      IF mudou_coordenador AND NEW.coordenador_id IS NOT NULL AND papel <> 'secretaria' THEN
        RAISE EXCEPTION 'Só a Secretaria escolhe o coordenador';
      END IF;
    END IF;
  END IF;

  -- Resposta ao cidadão: quem fala com o cidadão é a central (e o admin)
  IF mudou_resposta THEN
    IF auth.uid() IS NOT NULL AND COALESCE(public.papel_os(auth.uid()), '') NOT IN ('central', 'admin') THEN
      RAISE EXCEPTION 'Só a central de atendimento responde ao cidadão';
    END IF;
    NEW.resposta_cidadao := NULLIF(trim(COALESCE(NEW.resposta_cidadao, '')), '');
    mudou_resposta := NEW.resposta_cidadao IS DISTINCT FROM OLD.resposta_cidadao;
    NEW.respondido_em := CASE WHEN NEW.resposta_cidadao IS NULL THEN NULL ELSE now() END;
  END IF;

  -- Só um coordenador ativo pode receber O.S.
  IF mudou_coordenador AND NEW.coordenador_id IS NOT NULL THEN
    SELECT nome INTO nome_coordenador
    FROM public.profiles
    WHERE id = NEW.coordenador_id AND role = 'coordenador' AND COALESCE(status, 'ativo') = 'ativo';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O responsável escolhido não é um coordenador ativo';
    END IF;
  END IF;

  IF mudou_coordenador THEN
    NEW.visualizado_em := NULL;
  END IF;

  IF mudou_status THEN
    IF st_depois IN ('Encaminhada', 'Em Andamento', 'Aguardando Confirmação') AND NEW.coordenador_id IS NULL THEN
      RAISE EXCEPTION 'Escolha o coordenador responsável antes de encaminhar a O.S.';
    END IF;

    -- Passos que precisam de explicação
    IF motivo IS NULL THEN
      IF st_depois = 'Cancelado' THEN
        RAISE EXCEPTION 'Informe o motivo do cancelamento';
      ELSIF passo = 'Na Secretaria > Pendente' THEN
        RAISE EXCEPTION 'Informe por que a O.S. está voltando para a central';
      ELSIF passo = 'Aguardando Confirmação > Em Andamento' THEN
        RAISE EXCEPTION 'Informe por que a execução não foi aceita';
      ELSIF st_depois = 'Na Secretaria' AND st_antes IN ('Encaminhada', 'Em Andamento') THEN
        RAISE EXCEPTION 'Informe por que a O.S. está saindo do coordenador';
      END IF;
    END IF;

    CASE st_depois
      WHEN 'Na Secretaria' THEN NEW.na_secretaria_em := COALESCE(NEW.na_secretaria_em, now());
      WHEN 'Encaminhada' THEN NEW.encaminhado_em := now();
      WHEN 'Em Andamento' THEN NEW.iniciado_em := COALESCE(NEW.iniciado_em, now());
      WHEN 'Aguardando Confirmação' THEN NEW.executado_em := now();
      WHEN 'Concluído' THEN NEW.concluido_em := now();
      ELSE NULL;
    END CASE;
    IF st_antes = 'Concluído' AND st_depois <> 'Concluído' THEN
      NEW.concluido_em := NULL;
    END IF;
  ELSIF mudou_coordenador AND NEW.coordenador_id IS NOT NULL THEN
    NEW.encaminhado_em := now();
  END IF;

  IF mudou_resposta AND NEW.resposta_cidadao IS NOT NULL AND NOT mudou_status AND NOT mudou_coordenador AND motivo IS NULL THEN
    motivo := 'Resposta ao cidadão: ' || left(NEW.resposta_cidadao, 400);
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
      CASE WHEN mudou_status THEN st_depois END,
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

-- ---------------------------------------------------------------------
-- Cobrança registrada pela central
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_cobranca(p_chamado UUID, p_texto TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  papel TEXT := public.papel_os(auth.uid());
  texto TEXT := NULLIF(trim(COALESCE(p_texto, '')), '');
  os RECORD;
  nome_autor TEXT;
BEGIN
  IF papel IS NULL OR papel NOT IN ('central', 'admin') THEN
    RAISE EXCEPTION 'Só a central de atendimento registra cobrança';
  END IF;
  IF texto IS NULL THEN
    RAISE EXCEPTION 'Descreva a cobrança (quem cobrou e o que pediu)';
  END IF;
  IF length(texto) > 500 THEN
    RAISE EXCEPTION 'A cobrança pode ter no máximo 500 caracteres';
  END IF;

  SELECT id, status INTO os FROM public.chamados WHERE id = p_chamado FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O.S. não encontrada';
  END IF;
  IF os.status NOT IN ('Na Secretaria', 'Encaminhada', 'Em Andamento', 'Aguardando Confirmação') THEN
    RAISE EXCEPTION 'Só dá para cobrar uma O.S. que está com a Secretaria';
  END IF;

  UPDATE public.chamados
  SET cobrado_em = now(), cobrancas = cobrancas + 1
  WHERE id = os.id;

  SELECT nome INTO nome_autor FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.chamado_historico (chamado_id, detalhe, autor_id, autor_nome)
  VALUES (os.id, 'Cobrança: ' || texto, auth.uid(), nome_autor);

  RETURN (SELECT cobrancas FROM public.chamados WHERE id = os.id);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_cobranca(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_cobranca(UUID, TEXT) TO authenticated;
