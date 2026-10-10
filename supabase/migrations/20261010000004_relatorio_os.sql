-- =====================================================================
-- Relatórios para a gestão
--
-- relatorio_os_dados(inicio, fim): as O.S. abertas no período, só com o
-- que os relatórios precisam (serviço, endereço, datas das etapas,
-- prazo, coordenador). Sem nome, CPF, telefone ou descrição.
-- Só a equipe ativa usa. A conta dos números é feita na tela.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.relatorio_os_dados(p_inicio TIMESTAMPTZ, p_fim TIMESTAMPTZ)
RETURNS TABLE (
  id UUID,
  categoria_servico VARCHAR,
  endereco TEXT,
  status status_chamado,
  created_at TIMESTAMPTZ,
  sla_limite TIMESTAMPTZ,
  encaminhado_em TIMESTAMPTZ,
  executado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  coordenador_id UUID,
  cobrancas INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.categoria_servico, c.endereco, c.status, c.created_at, c.sla_limite,
         c.encaminhado_em, c.executado_em, c.concluido_em, c.coordenador_id, c.cobrancas
  FROM public.chamados c
  WHERE public.is_staff()
    AND c.created_at >= p_inicio
    AND c.created_at < p_fim
  ORDER BY c.created_at
  LIMIT 20000;
$$;

REVOKE ALL ON FUNCTION public.relatorio_os_dados(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_os_dados(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
