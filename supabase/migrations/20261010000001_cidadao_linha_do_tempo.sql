-- =====================================================================
-- O que o cidadão vê do pedido dele
--
-- Versões novas das consultas do cidadão, com as datas de cada etapa
-- (para a linha do tempo) e a foto do serviço feito (só depois de
-- concluída). Continua sem nada interno: nada de coordenador,
-- observações da equipe, motivos internos, CPF ou telefone.
--
-- As versões antigas ficam (o site publicado ainda as usa até o deploy).
-- =====================================================================

-- Pedidos da pessoa logada ("Meus Chamados")
CREATE OR REPLACE FUNCTION public.meus_chamados_v2()
RETURNS TABLE (
  id UUID,
  protocolo VARCHAR,
  categoria_servico VARCHAR,
  descricao TEXT,
  endereco TEXT,
  foto_url TEXT,
  status status_chamado,
  sla_limite TIMESTAMPTZ,
  resposta_cidadao TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  na_secretaria_em TIMESTAMPTZ,
  encaminhado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  foto_execucao_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.protocolo, c.categoria_servico, c.descricao, c.endereco, c.foto_url,
         c.status, c.sla_limite, c.resposta_cidadao, c.latitude, c.longitude,
         c.na_secretaria_em, c.encaminhado_em, c.concluido_em,
         CASE WHEN c.status = 'Concluído' THEN c.foto_execucao_url END,
         c.created_at, c.updated_at
  FROM public.chamados c
  WHERE auth.uid() IS NOT NULL
    AND c.cidadao_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.meus_chamados_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_chamados_v2() TO authenticated;

-- Consulta pública ("Acompanhar"), por protocolo ou CPF completo.
-- Só o primeiro nome, como antes.
CREATE OR REPLACE FUNCTION public.consultar_chamados_publico_v3(termo TEXT)
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
  na_secretaria_em TIMESTAMPTZ,
  encaminhado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  foto_execucao_url TEXT,
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
    c.na_secretaria_em,
    c.encaminhado_em,
    c.concluido_em,
    CASE WHEN c.status = 'Concluído' THEN c.foto_execucao_url END,
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

REVOKE ALL ON FUNCTION public.consultar_chamados_publico_v3(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamados_publico_v3(TEXT) TO anon, authenticated;
