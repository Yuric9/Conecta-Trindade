-- Conecta Trindade - endurecimento final do INSERT público de chamados
-- Garante que um cidadão/anônimo não consiga injetar campos operacionais ou alterar o estado inicial.

DROP POLICY IF EXISTS "chamados_insert_publico" ON public.chamados;

CREATE POLICY "chamados_insert_publico" ON public.chamados
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (
      auth.uid() IS NULL
      AND cidadao_id IS NULL
      AND status = 'Pendente'::status_chamado
      AND observacoes_internas IS NULL
      AND secretaria IS NULL
      AND prioridade IS NULL
      AND sla_limite IS NULL
      AND resposta_cidadao IS NULL
    )
    OR
    (
      auth.uid() IS NOT NULL
      AND cidadao_id = auth.uid()
      AND public.get_current_user_role() = 'cidadao'
      AND status = 'Pendente'::status_chamado
      AND observacoes_internas IS NULL
      AND secretaria IS NULL
      AND prioridade IS NULL
      AND sla_limite IS NULL
      AND resposta_cidadao IS NULL
    )
    OR
    (
      auth.uid() IS NOT NULL
      AND public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente')
    )
  );
