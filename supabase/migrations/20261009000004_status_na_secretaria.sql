-- =====================================================================
-- Conecta Trindade - etapa "Na Secretaria" (parte 1 de 2)
-- =====================================================================
-- Fluxo com a central de atendimento entre o cidadão e a Secretaria:
--
--   Pendente ──► Na Secretaria ──► Encaminhada ──► Em Andamento ──► Aguardando Confirmação ──► Concluído
--   (central     (Secretaria de    (com o           (coordenador)    (coordenador terminou)      (Secretaria
--    analisa)     Infraestrutura)   coordenador)                                                  confirmou)
--
-- Valor novo de enum só pode ser usado depois que esta transação termina;
-- o uso fica na parte 2 (20261009000005).
-- =====================================================================

ALTER TYPE status_chamado ADD VALUE IF NOT EXISTS 'Na Secretaria' AFTER 'Em Análise';
