-- =====================================================================
-- Ajustes de desempenho apontados pelo Supabase (Performance Advisor)
--
-- 1) Regras de acesso (RLS): auth.uid() escrito direto é calculado de
--    novo para CADA linha. Com (select auth.uid()) o banco calcula uma
--    vez só por consulta. O resultado (quem pode o quê) não muda.
-- 2) Índices repetidos: idx_chamados_protocolo repete o índice único da
--    coluna protocolo, e idx_chamados_coordenador repete
--    idx_chamados_coordenador_id. Índice repetido só gasta espaço e
--    deixa a gravação mais lenta.
-- =====================================================================

ALTER POLICY profiles_select ON public.profiles
  USING (((select auth.uid()) = id) OR public.is_admin());

ALTER POLICY profiles_insert ON public.profiles
  WITH CHECK (((select auth.uid()) = id) OR public.is_admin());

ALTER POLICY profiles_update ON public.profiles
  USING (((select auth.uid()) = id) OR public.is_admin())
  WITH CHECK (((select auth.uid()) = id) OR public.is_admin());

ALTER POLICY chamados_insert_publico ON public.chamados
  WITH CHECK (
    status = 'Pendente'::status_chamado
    AND prioridade = 'MEDIA'
    AND secretaria IS NULL
    AND sla_limite IS NULL
    AND observacoes_internas IS NULL
    AND resposta_cidadao IS NULL
    AND coordenador_id IS NULL
    AND na_secretaria_em IS NULL
    AND encaminhado_em IS NULL
    AND iniciado_em IS NULL
    AND executado_em IS NULL
    AND concluido_em IS NULL
    AND motivo_acao IS NULL
    AND visualizado_em IS NULL
    AND foto_execucao_url IS NULL
    AND respondido_em IS NULL
    AND cobrado_em IS NULL
    AND cobrancas = 0
    AND (cidadao_id IS NULL OR cidadao_id = (select auth.uid()))
  );

DO $$
BEGIN
  IF to_regclass('public.idx_chamados_protocolo') IS NOT NULL THEN
    EXECUTE 'DROP INDEX public.idx_chamados_protocolo';
  END IF;
  IF to_regclass('public.idx_chamados_coordenador') IS NOT NULL THEN
    EXECUTE 'DROP INDEX public.idx_chamados_coordenador';
  END IF;
END $$;
