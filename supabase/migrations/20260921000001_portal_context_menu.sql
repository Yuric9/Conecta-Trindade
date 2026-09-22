-- Configuração persistente do portal e suporte ao status EM_ANALISE.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_chamado')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'status_chamado' AND e.enumlabel = 'EM_ANALISE'
     ) THEN
    ALTER TYPE status_chamado ADD VALUE 'EM_ANALISE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.portal_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  menu_contexto_cards_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.portal_config (id, menu_contexto_cards_ativo)
VALUES (1, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.portal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura da configuração do portal" ON public.portal_config;
CREATE POLICY "Permitir leitura da configuração do portal"
  ON public.portal_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir atualização da configuração do portal" ON public.portal_config;
CREATE POLICY "Permitir atualização da configuração do portal"
  ON public.portal_config FOR UPDATE USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção da configuração do portal" ON public.portal_config;
CREATE POLICY "Permitir inserção da configuração do portal"
  ON public.portal_config FOR INSERT WITH CHECK (true);
