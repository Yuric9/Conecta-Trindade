-- Remove exclusivamente os registros de demonstração conhecidos pela migration inicial.
-- Nenhum registro criado por cidadãos reais é identificado por este cleanup.
DELETE FROM public.chamados
WHERE protocolo IN ('TRIN-2026-1001','TRIN-2026-1002','TRIN-2026-1003')
   OR nome_cidadao IN ('João Pereira da Silva','Maria Eduarda Souza','Carlos Alberto Rocha');
