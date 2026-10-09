-- =====================================================================
-- Conecta Trindade - tela do coordenador (fase 2)
-- =====================================================================
-- O coordenador NÃO lê a tabela chamados diretamente (veria CPF e
-- observações internas). Ele usa duas funções:
--
--   minhas_os()                 lista só as O.S. dele, com os campos de campo
--   coordenador_atualizar_os()  visualizar / iniciar / executar / devolver
--
-- A conclusão continua sendo da atendente ou do secretário: o coordenador
-- só leva a O.S. até "Aguardando Confirmação".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Campos novos
-- ---------------------------------------------------------------------
ALTER TABLE public.chamados
  -- Quando o coordenador abriu a O.S. pela primeira vez ("ciente")
  ADD COLUMN IF NOT EXISTS visualizado_em TIMESTAMPTZ,
  -- Foto do serviço executado (opcional), mesma forma da foto do cidadão
  ADD COLUMN IF NOT EXISTS foto_execucao_url TEXT;

-- Foto já vem comprimida do celular; o limite evita gravar arquivos enormes.
ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_foto_execucao_tamanho;
ALTER TABLE public.chamados ADD CONSTRAINT chamados_foto_execucao_tamanho
  CHECK (foto_execucao_url IS NULL OR length(foto_execucao_url) <= 3000000);

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
    AND visualizado_em IS NULL
    AND foto_execucao_url IS NULL
    AND (cidadao_id IS NULL OR cidadao_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 2. Regras do fluxo: novo coordenador ainda não viu a O.S.
--    (mesma função da migration 20261009000002, com essa linha a mais)
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
    IF NEW.status IN ('Encaminhada', 'Em Andamento', 'Aguardando Confirmação')
       AND NEW.coordenador_id IS NULL THEN
      RAISE EXCEPTION 'Escolha o coordenador responsável antes de encaminhar a O.S.';
    END IF;
    IF NEW.status = 'Cancelado' AND motivo IS NULL THEN
      RAISE EXCEPTION 'Informe o motivo do cancelamento';
    END IF;

    CASE NEW.status
      WHEN 'Encaminhada' THEN NEW.encaminhado_em := now();
      WHEN 'Em Andamento' THEN NEW.iniciado_em := COALESCE(NEW.iniciado_em, now());
      WHEN 'Aguardando Confirmação' THEN NEW.executado_em := now();
      WHEN 'Concluído' THEN NEW.concluido_em := now();
      ELSE NULL;
    END CASE;
    IF OLD.status = 'Concluído' AND NEW.status <> 'Concluído' THEN
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

-- ---------------------------------------------------------------------
-- 3. Lista do coordenador: só as O.S. dele, sem CPF nem observações internas
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.minhas_os()
RETURNS TABLE (
  id UUID,
  protocolo VARCHAR,
  categoria_servico VARCHAR,
  descricao TEXT,
  endereco TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  foto_url TEXT,
  nome_cidadao VARCHAR,
  telefone_cidadao VARCHAR,
  status status_chamado,
  prioridade TEXT,
  sla_limite TIMESTAMPTZ,
  encaminhado_em TIMESTAMPTZ,
  visualizado_em TIMESTAMPTZ,
  iniciado_em TIMESTAMPTZ,
  executado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  foto_execucao_url TEXT,
  observacao_encaminhamento TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.protocolo, c.categoria_servico, c.descricao, c.endereco,
    c.latitude, c.longitude, c.foto_url, c.nome_cidadao, c.telefone_cidadao,
    c.status, c.prioridade, c.sla_limite, c.encaminhado_em, c.visualizado_em,
    c.iniciado_em, c.executado_em, c.concluido_em, c.foto_execucao_url,
    -- Observação escrita por quem encaminhou para este coordenador
    (
      SELECT h.detalhe FROM public.chamado_historico h
      WHERE h.chamado_id = c.id AND h.coordenador_id = c.coordenador_id
      ORDER BY h.created_at DESC
      LIMIT 1
    ),
    c.created_at
  FROM public.chamados c
  WHERE auth.uid() IS NOT NULL
    AND c.coordenador_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'coordenador' AND COALESCE(p.status, 'ativo') = 'ativo'
    )
    -- Em aberto + concluídas nos últimos 30 dias (para ele ver o que fechou)
    AND (
      c.status IN ('Encaminhada', 'Em Andamento', 'Aguardando Confirmação')
      OR (c.status = 'Concluído' AND c.concluido_em > now() - interval '30 days')
    )
  ORDER BY c.sla_limite ASC NULLS LAST, c.created_at ASC;
$$;

-- ---------------------------------------------------------------------
-- 4. Ações do coordenador
--    visualizar: registra que ele viu a O.S. (uma vez)
--    iniciar:    Encaminhada → Em Andamento
--    executar:   → Aguardando Confirmação (observação e foto opcionais)
--    devolver:   volta para a central sem coordenador (motivo obrigatório)
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
      SET status = 'Pendente',
          coordenador_id = NULL,
          motivo_acao = 'Devolvida pelo coordenador: ' || obs
      WHERE id = os.id;

    ELSE
      RAISE EXCEPTION 'Ação inválida: %', p_acao;
  END CASE;

  RETURN (SELECT status::text FROM public.chamados WHERE id = os.id);
END;
$$;

-- Só usuários logados chamam; as funções conferem se é coordenador.
REVOKE ALL ON FUNCTION public.minhas_os() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.coordenador_atualizar_os(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minhas_os() TO authenticated;
GRANT EXECUTE ON FUNCTION public.coordenador_atualizar_os(UUID, TEXT, TEXT, TEXT) TO authenticated;
