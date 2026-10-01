-- Corrige o status "Em Análise".
--
-- A migration 20260921000001 adicionou o valor 'EM_ANALISE' ao enum, mas a
-- aplicação envia 'Em Análise' (mesmo padrão de 'Em Andamento' e 'Concluído').
-- Com isso o Postgres recusava a atualização com:
--   invalid input value for enum status_chamado: "Em Análise"
--
-- Observação: um valor novo de enum só pode ser usado depois que a transação
-- que o criou terminar, por isso a conversão dos registros antigos fica na
-- migration seguinte (20261001000002).

ALTER TYPE status_chamado ADD VALUE IF NOT EXISTS 'Em Análise' AFTER 'Pendente';
