-- Conecta Trindade - endurecimento final do INSERT público de chamados
-- Impede que cidadão/anônimo injete protocolo ou campos operacionais.

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

CREATE OR REPLACE FUNCTION public.gerar_protocolo_chamado()
RETURNS TRIGGER AS $$
DECLARE
  ano_atual TEXT := TO_CHAR(NOW(), 'YYYY');
  proximo_seq BIGINT;
BEGIN
  -- O protocolo é sempre emitido pelo banco; nunca é aceito do cliente.
  proximo_seq := NEXTVAL('chamado_protocolo_seq');
  NEW.protocolo := 'TRIN-' || ano_atual || '-' || LPAD(proximo_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chamados_auto_protocolo ON public.chamados;
CREATE TRIGGER trigger_chamados_auto_protocolo
BEFORE INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.gerar_protocolo_chamado();
