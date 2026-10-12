-- =====================================================================
-- Regras de acesso (RLS) mais rápidas (Performance Advisor do Supabase)
--
-- auth.uid() escrito direto é calculado de novo para CADA linha. Com
-- (select auth.uid()) o banco calcula uma vez só por consulta. O
-- resultado (quem pode o quê) não muda.
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
