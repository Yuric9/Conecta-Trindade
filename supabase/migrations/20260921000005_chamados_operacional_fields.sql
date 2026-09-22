-- Campos operacionais usados pelo painel administrativo.
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS fotos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS secretaria TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS prioridade TEXT CHECK (prioridade IS NULL OR prioridade IN ('BAIXA','MEDIA','ALTA','URGENTE'));
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS sla_limite TIMESTAMPTZ;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS resposta_cidadao TEXT;
