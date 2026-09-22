-- Consulta autenticada dos próprios chamados por CPF, sem permitir enumeração de terceiros.
CREATE OR REPLACE FUNCTION public.consultar_meus_chamados_por_cpf(p_cpf TEXT)
RETURNS TABLE (
  id UUID,
  protocolo TEXT,
  categoria_servico TEXT,
  descricao TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.protocolo::TEXT, c.categoria_servico::TEXT, c.descricao::TEXT,
         c.status::TEXT, c.created_at, c.updated_at
  FROM public.chamados c
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE auth.uid() IS NOT NULL
    AND p.id = c.cidadao_id
    AND p.cpf = regexp_replace(COALESCE(p_cpf,''), '\D', '', 'g')
    AND p.id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.consultar_meus_chamados_por_cpf(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_meus_chamados_por_cpf(TEXT) TO authenticated;
