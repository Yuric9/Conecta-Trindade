-- =====================================================================
-- Conecta Trindade - quem pode fazer cada passo da O.S. (parte 2 de 2)
-- =====================================================================
-- Papéis no fluxo (calculados do cadastro em profiles):
--
--   admin        role 'admin'                                  tudo
--   central      role 'atendente'/'fiscal' sem secretaria       analisa e envia à Secretaria, ou cancela
--   secretaria   role 'gestor', ou 'atendente'/'fiscal' com     escolhe o coordenador, confirma a conclusão,
--                secretaria = 'INFRAESTRUTURA'                  devolve à central
--   coordenador  role 'coordenador'                             inicia, executa, devolve à Secretaria
--
-- As regras ficam no gatilho: valem para a tela, para a API e para qualquer
-- outro caminho. O SQL Editor (sem usuário logado) continua sem restrição.
-- =====================================================================

-- Data em que a O.S. chegou à Secretaria
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS na_secretaria_em TIMESTAMPTZ;

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
    AND (cidadao_id IS NULL OR cidadao_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 1. Papel do usuário no fluxo da O.S.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.papel_os(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.role = 'admin' THEN 'admin'
    WHEN p.role = 'coordenador' THEN 'coordenador'
    WHEN p.role = 'gestor' THEN 'secretaria'
    WHEN p.role IN ('atendente', 'fiscal') AND p.secretaria = 'INFRAESTRUTURA' THEN 'secretaria'
    WHEN p.role IN ('atendente', 'fiscal') THEN 'central'
  END
  FROM public.profiles p
  WHERE p.id = uid AND COALESCE(p.status, 'ativo') = 'ativo';
$$;

REVOKE ALL ON FUNCTION public.papel_os(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Regras do fluxo (substitui a versão de 20261009000003)
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
-- 3. Coordenador devolve para a Secretaria (antes voltava para a central)
--    Mesma função de 20261009000003, só o passo "devolver" mudou.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coordenador_atualizar_os(
  p_chamado UUID,
  p_acao TEXT,
  p_observacao TEXT DEFAULT NULL,
  p_foto TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  os RECORD;
  obs TEXT := NULLIF(trim(COALESCE(p_observacao, '')), '');
  nome_autor TEXT;
BEGIN
  SELECT nome INTO nome_autor
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'coordenador' AND COALESCE(status, 'ativo') = 'ativo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso permitido só para coordenador ativo';
  END IF;

  SELECT c.id, c.status, c.coordenador_id, c.visualizado_em INTO os
  FROM public.chamados c
  WHERE c.id = p_chamado
  FOR UPDATE;

  IF NOT FOUND OR os.coordenador_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'O.S. não encontrada entre as suas';
  END IF;

  IF length(COALESCE(obs, '')) > 500 THEN
    RAISE EXCEPTION 'A observação pode ter no máximo 500 caracteres';
  END IF;

  CASE p_acao
    WHEN 'visualizar' THEN
      IF os.visualizado_em IS NULL THEN
        UPDATE public.chamados SET visualizado_em = now() WHERE id = os.id;
        INSERT INTO public.chamado_historico (chamado_id, detalhe, autor_id, autor_nome)
        VALUES (os.id, 'Visualizou a O.S.', auth.uid(), nome_autor);
      END IF;

    WHEN 'iniciar' THEN
      IF os.status <> 'Encaminhada' THEN
        RAISE EXCEPTION 'Só dá para iniciar uma O.S. encaminhada';
      END IF;
      UPDATE public.chamados
      SET status = 'Em Andamento',
          visualizado_em = COALESCE(visualizado_em, now()),
          motivo_acao = obs
      WHERE id = os.id;

    WHEN 'executar' THEN
      IF os.status NOT IN ('Encaminhada', 'Em Andamento') THEN
        RAISE EXCEPTION 'Esta O.S. não está em execução';
      END IF;
      IF p_foto IS NOT NULL AND p_foto !~ '^(data:image/(jpeg|png|webp);base64,|https://)' THEN
        RAISE EXCEPTION 'Foto inválida';
      END IF;
      UPDATE public.chamados
      SET status = 'Aguardando Confirmação',
          visualizado_em = COALESCE(visualizado_em, now()),
          iniciado_em = COALESCE(iniciado_em, now()),
          foto_execucao_url = COALESCE(p_foto, foto_execucao_url),
          motivo_acao = COALESCE(obs, CASE WHEN p_foto IS NOT NULL THEN 'Enviou foto do serviço' END)
      WHERE id = os.id;

    WHEN 'devolver' THEN
      IF os.status NOT IN ('Encaminhada', 'Em Andamento') THEN
        RAISE EXCEPTION 'Só dá para devolver uma O.S. que ainda não foi executada';
      END IF;
      IF obs IS NULL THEN
        RAISE EXCEPTION 'Informe o motivo da devolução';
      END IF;
      UPDATE public.chamados
      SET status = 'Na Secretaria',
          motivo_acao = 'Devolvida pelo coordenador: ' || obs
      WHERE id = os.id;

    ELSE
      RAISE EXCEPTION 'Ação inválida: %', p_acao;
  END CASE;

  RETURN (SELECT status::text FROM public.chamados WHERE id = os.id);
END;
$$;
