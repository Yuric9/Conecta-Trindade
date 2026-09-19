-- =====================================================================
-- CONECTA TRINDADE - SCHEMA OFICIAL DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- =====================================================================
-- Execute este script completo no SQL Editor do Supabase para criar a
-- tabela 'chamados', a view 'solicitacoes', triggers de protocolo e updated_at,
-- índices de alta performance e políticas de segurança RLS.
-- =====================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipo enumerado para o status do chamado conforme especificação
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_chamado') THEN
    CREATE TYPE status_chamado AS ENUM (
      'Pendente',
      'Em Andamento',
      'Concluído',
      'Cancelado'
    );
  END IF;
END $$;

-- Sequência para numeração de protocolos do município (TRIN-YYYY-XXXX)
CREATE SEQUENCE IF NOT EXISTS chamado_protocolo_seq START WITH 1001;

-- Tabela principal: chamados
CREATE TABLE IF NOT EXISTS public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo VARCHAR(30) UNIQUE NOT NULL,
  nome_cidadao VARCHAR(255) NOT NULL,
  cpf_cidadao VARCHAR(20) NOT NULL,
  telefone_cidadao VARCHAR(20) NOT NULL,
  categoria_servico VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  endereco TEXT NOT NULL,
  foto_url TEXT,
  status status_chamado NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chamados_updated_at ON public.chamados;
CREATE TRIGGER trigger_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para geração automática do protocolo TRIN-YYYY-XXXX caso não enviado
CREATE OR REPLACE FUNCTION public.gerar_protocolo_chamado()
RETURNS TRIGGER AS $$
DECLARE
  ano_atual TEXT := TO_CHAR(NOW(), 'YYYY');
  proximo_seq BIGINT;
BEGIN
  IF NEW.protocolo IS NULL OR TRIM(NEW.protocolo) = '' THEN
    proximo_seq := NEXTVAL('chamado_protocolo_seq');
    NEW.protocolo := 'TRIN-' || ano_atual || '-' || LPAD(proximo_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chamados_auto_protocolo ON public.chamados;
CREATE TRIGGER trigger_chamados_auto_protocolo
  BEFORE INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_protocolo_chamado();

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_chamados_protocolo ON public.chamados(protocolo);
CREATE INDEX IF NOT EXISTS idx_chamados_cpf_cidadao ON public.chamados(cpf_cidadao);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_categoria ON public.chamados(categoria_servico);
CREATE INDEX IF NOT EXISTS idx_chamados_created_at ON public.chamados(created_at DESC);

-- View sinônima 'solicitacoes'
CREATE OR REPLACE VIEW public.solicitacoes AS
  SELECT * FROM public.chamados;

-- Políticas de Segurança RLS
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserção de chamados por qualquer usuário"
  ON public.chamados
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de chamados"
  ON public.chamados
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir atualização por administradores e fiscais"
  ON public.chamados
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir exclusão por administradores"
  ON public.chamados
  FOR DELETE
  USING (auth.role() = 'authenticated');
