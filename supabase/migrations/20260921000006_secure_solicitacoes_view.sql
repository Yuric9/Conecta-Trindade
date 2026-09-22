-- Restringe a view legada solicitacoes para não contornar RLS e expor PII.
CREATE OR REPLACE VIEW public.solicitacoes AS
SELECT
  id,
  protocolo,
  categoria_servico,
  descricao,
  status,
  created_at,
  updated_at
FROM public.chamados;
