-- =====================================================================
-- Consulta pública ("Acompanhar") só pelo número do protocolo
--
-- Antes dava para consultar pelo CPF. Como muitos CPFs já vazaram,
-- quem soubesse o CPF de alguém veria os pedidos (e o endereço) da
-- pessoa. Agora: só o protocolo, que é sorteado e só o cidadão recebe.
-- O cidadão logado vê todos os pedidos dele em "Meus Chamados".
--
-- As versões antigas (que aceitavam CPF) deixam de ser acessíveis.
-- =====================================================================

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
  WHERE upper(c.protocolo) = upper(trim(termo))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamados_publico_v3(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamados_publico_v3(TEXT) TO anon, authenticated;

-- Versões antigas (aceitavam CPF): ninguém mais chama (se ainda existirem)
DO $$
BEGIN
  IF to_regprocedure('public.consultar_chamados_publico(text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.consultar_chamados_publico(TEXT) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.consultar_chamados_publico_v2(text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.consultar_chamados_publico_v2(TEXT) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
