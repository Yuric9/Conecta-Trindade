-- =====================================================================
-- Painel de cobrança por coordenador
--
-- 1. painel_coordenadores(): para cada coordenador, quantas O.S. estão
--    abertas, atrasadas, sem ser vistas, esperando confirmação, quantas
--    foram concluídas em 30 dias e o tempo médio de execução. Traz também
--    a lista das O.S. abertas (para a mensagem de cobrança).
--    Conta direto no banco: não depende das 100 O.S. que o painel carrega.
-- 2. registrar_cobranca_coordenador(): guarda quem cobrou e quando. Cada
--    O.S. aberta do coordenador ganha uma linha no histórico.
--
-- Ver o painel: equipe (admin, central, secretaria). Sem CPF.
-- Cobrar o coordenador: só a Secretaria de Infraestrutura (secretário ou
-- atendente da pasta) e o admin. A central só acompanha.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cobrancas_coordenador (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  coordenador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  autor_id UUID,
  autor_nome TEXT,
  qtd_os INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobrancas_coordenador
  ON public.cobrancas_coordenador(coordenador_id, created_at DESC);

-- Ninguém lê nem grava direto: só pelas funções abaixo
ALTER TABLE public.cobrancas_coordenador ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cobrancas_coordenador FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_chamados_coordenador
  ON public.chamados(coordenador_id)
  WHERE coordenador_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 1. Números de cada coordenador
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.painel_coordenadores()
RETURNS TABLE (
  coordenador_id UUID,
  nome TEXT,
  telefone TEXT,
  servicos TEXT[],
  status TEXT,
  abertas INTEGER,
  nao_vistas INTEGER,
  em_execucao INTEGER,
  atrasadas INTEGER,
  aguardando INTEGER,
  concluidas_30d INTEGER,
  tempo_medio_horas NUMERIC,
  ultima_cobranca TIMESTAMPTZ,
  ultima_cobranca_por TEXT,
  cobrancas_7d INTEGER,
  pendentes JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.nome,
    p.telefone,
    p.servicos,
    p.status,
    COALESCE(n.abertas, 0),
    COALESCE(n.nao_vistas, 0),
    COALESCE(n.em_execucao, 0),
    COALESCE(n.atrasadas, 0),
    COALESCE(n.aguardando, 0),
    COALESCE(n.concluidas_30d, 0),
    n.tempo_medio_horas,
    cb.created_at,
    cb.autor_nome,
    COALESCE(cb7.qtd, 0),
    COALESCE(pend.lista, '[]'::jsonb)
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE c.status IN ('Encaminhada', 'Em Andamento'))::int AS abertas,
      count(*) FILTER (WHERE c.status = 'Encaminhada' AND c.visualizado_em IS NULL)::int AS nao_vistas,
      count(*) FILTER (WHERE c.status = 'Em Andamento')::int AS em_execucao,
      count(*) FILTER (WHERE c.status IN ('Encaminhada', 'Em Andamento') AND c.sla_limite < now())::int AS atrasadas,
      count(*) FILTER (WHERE c.status = 'Aguardando Confirmação')::int AS aguardando,
      count(*) FILTER (WHERE c.status = 'Concluído' AND c.concluido_em >= now() - interval '30 days')::int AS concluidas_30d,
      round(
        (avg(extract(epoch FROM (c.executado_em - c.encaminhado_em)))
          FILTER (WHERE c.executado_em >= now() - interval '30 days'
                    AND c.encaminhado_em IS NOT NULL
                    AND c.executado_em >= c.encaminhado_em) / 3600)::numeric,
        1
      ) AS tempo_medio_horas
    FROM public.chamados c
    WHERE c.coordenador_id = p.id
  ) n ON true
  LEFT JOIN LATERAL (
    SELECT x.created_at, x.autor_nome
    FROM public.cobrancas_coordenador x
    WHERE x.coordenador_id = p.id
    ORDER BY x.created_at DESC
    LIMIT 1
  ) cb ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS qtd
    FROM public.cobrancas_coordenador x
    WHERE x.coordenador_id = p.id AND x.created_at >= now() - interval '7 days'
  ) cb7 ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', o.id,
      'protocolo', o.protocolo,
      'categoria', o.categoria_servico,
      'endereco', o.endereco,
      'status', o.status,
      'sla_limite', o.sla_limite,
      'encaminhado_em', o.encaminhado_em,
      'visualizado_em', o.visualizado_em
    ) ORDER BY o.sla_limite NULLS LAST, o.encaminhado_em) AS lista
    FROM (
      SELECT *
      FROM public.chamados c
      WHERE c.coordenador_id = p.id AND c.status IN ('Encaminhada', 'Em Andamento')
      ORDER BY c.sla_limite NULLS LAST, c.encaminhado_em
      LIMIT 30
    ) o
  ) pend ON true
  WHERE p.role = 'coordenador'
    AND public.is_staff()
  ORDER BY COALESCE(n.atrasadas, 0) DESC, COALESCE(n.abertas, 0) DESC, p.nome;
$$;

REVOKE ALL ON FUNCTION public.painel_coordenadores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.painel_coordenadores() TO authenticated;

-- ---------------------------------------------------------------------
-- 2. Registrar a cobrança (feita pelo WhatsApp)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_cobranca_coordenador(p_coordenador UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  papel TEXT := public.papel_os(auth.uid());
  nome_autor TEXT;
  nome_coord TEXT;
  qtd INTEGER;
BEGIN
  IF papel IS NULL OR papel NOT IN ('admin', 'secretaria') THEN
    RAISE EXCEPTION 'Só a Secretaria de Infraestrutura cobra o coordenador';
  END IF;

  SELECT nome INTO nome_coord FROM public.profiles WHERE id = p_coordenador AND role = 'coordenador';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coordenador não encontrado';
  END IF;

  SELECT nome INTO nome_autor FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.chamado_historico (chamado_id, status_anterior, status_novo, coordenador_id, coordenador_nome, detalhe, autor_id, autor_nome)
  SELECT c.id, c.status::text, c.status::text, p_coordenador, nome_coord,
         'Coordenador cobrado pelo WhatsApp', auth.uid(), nome_autor
  FROM public.chamados c
  WHERE c.coordenador_id = p_coordenador AND c.status IN ('Encaminhada', 'Em Andamento');
  GET DIAGNOSTICS qtd = ROW_COUNT;

  INSERT INTO public.cobrancas_coordenador (coordenador_id, autor_id, autor_nome, qtd_os)
  VALUES (p_coordenador, auth.uid(), nome_autor, qtd);

  RETURN qtd;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_cobranca_coordenador(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_cobranca_coordenador(UUID) TO authenticated;
