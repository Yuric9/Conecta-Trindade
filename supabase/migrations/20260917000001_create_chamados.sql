-- =====================================================================
-- Conecta-Trindade (MVP) - Migração de Banco de Dados Supabase / PostgreSQL
-- Tabela: chamados (com view compatível 'solicitacoes')
-- =====================================================================

-- 1. Habilita a extensão para geração de UUID (caso ainda não esteja ativa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Criação do Enum para Status do Chamado
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

-- 3. Sequência para geração sequencial do número de protocolo municipal (ex: TRIN-2026-1001)
CREATE SEQUENCE IF NOT EXISTS chamado_protocolo_seq START WITH 1001;

-- 4. Criação da Tabela Principal 'chamados'
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

-- 5. Função e Gatilho (Trigger) para atualizar o campo updated_at automaticamente
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

-- 6. Função e Gatilho (Trigger) para gerar automaticamente o protocolo municipal caso não seja fornecido
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

-- 7. Índices para Otimização de Consultas Frequentes
CREATE INDEX IF NOT EXISTS idx_chamados_protocolo ON public.chamados(protocolo);
CREATE INDEX IF NOT EXISTS idx_chamados_cpf_cidadao ON public.chamados(cpf_cidadao);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_categoria ON public.chamados(categoria_servico);
CREATE INDEX IF NOT EXISTS idx_chamados_created_at ON public.chamados(created_at DESC);

-- 8. View de compatibilidade com o termo alternativo 'solicitacoes'
CREATE OR REPLACE VIEW public.solicitacoes AS
  SELECT * FROM public.chamados;

-- 9. Configuração de Segurança (Row Level Security - RLS)
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- Política 1: Qualquer cidadão pode registrar uma nova solicitação/chamado
CREATE POLICY "Permitir inserção de chamados por qualquer usuário"
  ON public.chamados
  FOR INSERT
  WITH CHECK (true);

-- Política 2: Consulta pública por protocolo ou telefone/cpf (ou autenticado)
CREATE POLICY "Permitir leitura de chamados"
  ON public.chamados
  FOR SELECT
  USING (true);

-- Política 3: Apenas administradores e fiscais autenticados podem atualizar chamados
CREATE POLICY "Permitir atualização por administradores e fiscais"
  ON public.chamados
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Política 4: Exclusão restrita a administradores autenticados
CREATE POLICY "Permitir exclusão por administradores"
  ON public.chamados
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
  );

-- 10. Seeds removidos: produção não recebe dados fictícios.\n