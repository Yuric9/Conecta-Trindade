-- =====================================================================
-- Arquivamento de O.S. concluídas e validade das fotos
--
-- Regra: 30 dias depois de concluída, a O.S.
--   - é arquivada (sai da lista principal do painel, mas continua no
--     banco, nos relatórios, em "Meus chamados" e na consulta pelo
--     protocolo);
--   - tem as fotos apagadas do Storage (libera espaço).
-- Dados e cadastros das pessoas nunca são apagados.
--
-- Quem executa: a rotina diária do site (/api/manter-ativo), com a chave
-- secreta. As funções abaixo não podem ser chamadas pelo navegador.
-- =====================================================================

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fotos_expiradas_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chamados_arquivado_em ON public.chamados(arquivado_em);

-- O.S. reaberta (saiu de "Concluído") volta para a lista principal
CREATE OR REPLACE FUNCTION public.chamado_desarquivar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text <> 'Concluído' THEN
    NEW.arquivado_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chamado_desarquivar
  BEFORE UPDATE OF status ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.chamado_desarquivar();

-- O.S. concluídas há mais de p_dias que ainda têm foto
CREATE OR REPLACE FUNCTION public.rotina_fotos_vencidas(p_dias INTEGER DEFAULT 30, p_limite INTEGER DEFAULT 100)
RETURNS TABLE (id UUID, foto_url TEXT, foto_execucao_url TEXT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.foto_url, c.foto_execucao_url
  FROM public.chamados c
  WHERE c.status::text = 'Concluído'
    AND COALESCE(c.concluido_em, c.updated_at) < now() - make_interval(days => p_dias)
    AND (c.foto_url IS NOT NULL OR c.foto_execucao_url IS NOT NULL)
  ORDER BY COALESCE(c.concluido_em, c.updated_at)
  LIMIT p_limite;
$$;

-- Arquiva as O.S. concluídas há mais de p_dias. Devolve quantas.
CREATE OR REPLACE FUNCTION public.rotina_arquivar_concluidos(p_dias INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total INTEGER;
BEGIN
  UPDATE public.chamados
  SET arquivado_em = now()
  WHERE status::text = 'Concluído'
    AND arquivado_em IS NULL
    AND COALESCE(concluido_em, updated_at) < now() - make_interval(days => p_dias);
  GET DIAGNOSTICS total = ROW_COUNT;
  RETURN total;
END;
$$;

-- Só o servidor (chave secreta) executa a rotina
REVOKE ALL ON FUNCTION public.chamado_desarquivar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotina_fotos_vencidas(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotina_arquivar_concluidos(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotina_fotos_vencidas(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.rotina_arquivar_concluidos(INTEGER) TO service_role;

-- A equipe lê as colunas de chamados uma a uma (20261009000006_protecao_dados_pessoais):
-- as datas novas precisam entrar na lista (não são dados pessoais)
GRANT SELECT (arquivado_em, fotos_expiradas_em) ON public.chamados TO authenticated;
