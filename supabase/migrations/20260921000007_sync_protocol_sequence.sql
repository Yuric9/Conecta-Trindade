-- Garante que a sequência de protocolos continue acima do maior protocolo existente.
SELECT setval(
  'public.chamado_protocolo_seq',
  GREATEST(
    COALESCE(
      (SELECT MAX((regexp_match(protocolo, '^TRIN-[0-9]{4}-([0-9]+)$'))[1]::BIGINT)
       FROM public.chamados
       WHERE protocolo ~ '^TRIN-[0-9]{4}-[0-9]+$'),
      1000
    ),
    1000
  ),
  true
);
