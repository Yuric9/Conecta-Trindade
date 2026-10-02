-- =====================================================================
-- Conecta Trindade - campos de gestão e localização do chamado
-- =====================================================================
-- Até aqui a janela de edição do painel mostrava Secretaria, Prioridade,
-- Prazo, Observações e Resposta, mas essas colunas não existiam e nada era
-- gravado. A tela de solicitação também não tinha onde salvar o ponto no
-- mapa. Todas as colunas são opcionais: chamados existentes não mudam.
-- =====================================================================

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS secretaria TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT NOT NULL DEFAULT 'MEDIA',
  ADD COLUMN IF NOT EXISTS sla_limite TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes_internas TEXT,
  ADD COLUMN IF NOT EXISTS resposta_cidadao TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_prioridade_valida;
ALTER TABLE public.chamados ADD CONSTRAINT chamados_prioridade_valida
  CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE'));

-- Ponto precisa estar dentro do retângulo do município (lib/geo.ts).
ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_localizacao_trindade;
ALTER TABLE public.chamados ADD CONSTRAINT chamados_localizacao_trindade
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -16.82 AND -16.48 AND longitude BETWEEN -49.71 AND -49.37)
  );

-- O cidadão abre o chamado, mas não preenche campos da equipe.
-- (ALTER em vez de DROP/CREATE: a política já existe desde 20261001000002.)
ALTER POLICY "chamados_insert_publico" ON public.chamados
  WITH CHECK (
    status = 'Pendente'
    AND prioridade = 'MEDIA'
    AND secretaria IS NULL
    AND sla_limite IS NULL
    AND observacoes_internas IS NULL
    AND resposta_cidadao IS NULL
  );

-- Consulta pública com a resposta da equipe ao cidadão (nunca as
-- observações internas). Como o retorno mudou, é uma função nova (_v2);
-- a versão anterior fica sem uso.
CREATE OR REPLACE FUNCTION public.consultar_chamados_publico_v2(termo TEXT)
RETURNS TABLE (
  id UUID,
  protocolo VARCHAR,
  primeiro_nome TEXT,
  categoria_servico VARCHAR,
  descricao TEXT,
  endereco TEXT,
  foto_url TEXT,
  status status_chamado,
  resposta_cidadao TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.protocolo,
    split_part(c.nome_cidadao, ' ', 1),
    c.categoria_servico,
    c.descricao,
    c.endereco,
    c.foto_url,
    c.status,
    c.resposta_cidadao,
    c.created_at,
    c.updated_at
  FROM public.chamados c
  WHERE
    upper(c.protocolo) = upper(trim(termo))
    OR (
      length(regexp_replace(termo, '\D', '', 'g')) = 11
      AND regexp_replace(c.cpf_cidadao, '\D', '', 'g') = regexp_replace(termo, '\D', '', 'g')
    )
  ORDER BY c.created_at DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamados_publico_v2(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamados_publico_v2(TEXT) TO anon, authenticated;
