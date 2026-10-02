-- =====================================================================
-- Conecta Trindade - "Meus chamados"
-- =====================================================================
-- Liga o chamado à conta de quem abriu (quando a pessoa está logada).
-- A ligação é pela conta, não pelo CPF: com CPF, qualquer um poderia
-- criar uma conta com o CPF de outra pessoa e ver os chamados dela.
-- =====================================================================

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS cidadao_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chamados_cidadao_id ON public.chamados(cidadao_id);

-- Quem abre o chamado só pode ligá-lo à própria conta (visitante: nenhuma).
ALTER POLICY "chamados_insert_publico" ON public.chamados
  WITH CHECK (
    status = 'Pendente'
    AND prioridade = 'MEDIA'
    AND secretaria IS NULL
    AND sla_limite IS NULL
    AND observacoes_internas IS NULL
    AND resposta_cidadao IS NULL
    AND (cidadao_id IS NULL OR cidadao_id = auth.uid())
  );

-- Chamados da pessoa logada, sem as observações internas da equipe.
-- (Função em vez de política de leitura: a política liberaria todas as
-- colunas da linha, inclusive as observações internas.)
CREATE OR REPLACE FUNCTION public.meus_chamados()
RETURNS TABLE (
  id UUID,
  protocolo VARCHAR,
  categoria_servico VARCHAR,
  descricao TEXT,
  endereco TEXT,
  foto_url TEXT,
  status status_chamado,
  secretaria TEXT,
  sla_limite TIMESTAMPTZ,
  resposta_cidadao TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.protocolo, c.categoria_servico, c.descricao, c.endereco, c.foto_url,
         c.status, c.secretaria, c.sla_limite, c.resposta_cidadao, c.latitude, c.longitude,
         c.created_at, c.updated_at
  FROM public.chamados c
  WHERE auth.uid() IS NOT NULL
    AND c.cidadao_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.meus_chamados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_chamados() TO authenticated;
