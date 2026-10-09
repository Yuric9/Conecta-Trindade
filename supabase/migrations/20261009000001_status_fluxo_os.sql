-- =====================================================================
-- Conecta Trindade - status do fluxo da O.S. (parte 1 de 2)
-- =====================================================================
-- Fluxo combinado com a Secretaria de Infraestrutura:
--
--   Pendente ──► Encaminhada ──► Em Andamento ──► Aguardando Confirmação ──► Concluído
--   (nova)       (atendente/      (coordenador     (coordenador disse que       (atendente/
--                 secretário)      começou)         terminou)                    secretário confirmou)
--
--   Cancelado em qualquer etapa, sempre com motivo.
--
-- Um valor novo de enum só pode ser usado depois que a transação que o
-- criou termina. Por isso este arquivo só cria os valores; o uso deles
-- fica na parte 2 (20261009000002).
-- =====================================================================

ALTER TYPE status_chamado ADD VALUE IF NOT EXISTS 'Encaminhada' AFTER 'Em Análise';
ALTER TYPE status_chamado ADD VALUE IF NOT EXISTS 'Aguardando Confirmação' AFTER 'Em Andamento';
