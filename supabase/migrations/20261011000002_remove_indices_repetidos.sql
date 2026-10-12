-- =====================================================================
-- Remove índices repetidos da tabela chamados
--
-- idx_chamados_protocolo repete o índice único da coluna protocolo, e
-- idx_chamados_coordenador repete idx_chamados_coordenador_id. Índice
-- repetido só gasta espaço e deixa a gravação mais lenta.
--
-- PENDENTE em produção: rodar no SQL Editor do Supabase (a ferramenta
-- automática pede uma confirmação para DROP que não aparece).
-- =====================================================================

DO $$
BEGIN
  IF to_regclass('public.idx_chamados_protocolo') IS NOT NULL THEN
    EXECUTE 'DROP INDEX public.idx_chamados_protocolo';
  END IF;
  IF to_regclass('public.idx_chamados_coordenador') IS NOT NULL THEN
    EXECUTE 'DROP INDEX public.idx_chamados_coordenador';
  END IF;
END $$;
