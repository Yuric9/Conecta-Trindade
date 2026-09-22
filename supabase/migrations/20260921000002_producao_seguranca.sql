-- Conecta Trindade - endurecimento de segurança, perfis, LGPD e status canônico
-- Esta migration é incremental e preserva dados existentes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Perfis vinculados ao Supabase Auth.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cpf TEXT,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'cidadao'
    CHECK (role IN ('admin','servidor','fiscal','gestor','atendente','cidadao')),
  secretaria TEXT,
  cargo TEXT,
  status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo','inativo','bloqueado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated;

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente')
  );

DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;
CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, cpf, telefone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\\D', '', 'g'), ''),
    NULLIF(NEW.raw_user_meta_data->>'telefone', ''),
    'cidadao'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = CASE WHEN EXCLUDED.nome <> '' THEN EXCLUDED.nome ELSE public.profiles.nome END,
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    telefone = COALESCE(EXCLUDED.telefone, public.profiles.telefone),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Status canônico. Valores antigos são convertidos sem apagar registros.
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS cidadao_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_chamado') THEN
    ALTER TABLE public.chamados ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.chamados ALTER COLUMN status TYPE TEXT USING (
      CASE status::TEXT
        WHEN 'ABERTO' THEN 'Pendente'
        WHEN 'TRIADO' THEN 'Em Análise'
        WHEN 'EM_ANALISE' THEN 'Em Análise'
        WHEN 'EM_ANDAMENTO' THEN 'Em Andamento'
        WHEN 'RESOLVIDO' THEN 'Concluído'
        WHEN 'AVALIADO' THEN 'Concluído'
        WHEN 'REJEITADO' THEN 'Cancelado'
        WHEN 'CANCELADO' THEN 'Cancelado'
        ELSE status::TEXT
      END
    );
    DROP TYPE status_chamado;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_chamado') THEN
    CREATE TYPE status_chamado AS ENUM ('Pendente','Em Análise','Em Andamento','Concluído','Cancelado');
  END IF;
END $$;

ALTER TABLE public.chamados
  ALTER COLUMN status TYPE status_chamado USING status::status_chamado,
  ALTER COLUMN status SET DEFAULT 'Pendente';

CREATE INDEX IF NOT EXISTS idx_chamados_cidadao_id ON public.chamados(cidadao_id);
CREATE INDEX IF NOT EXISTS idx_chamados_observacoes ON public.chamados USING gin (to_tsvector('simple', COALESCE(observacoes_internas,'')));

-- 3) Normalização de CPF existente.
UPDATE public.chamados SET cpf_cidadao = regexp_replace(cpf_cidadao, '\\D', '', 'g')
WHERE cpf_cidadao IS NOT NULL AND cpf_cidadao <> regexp_replace(cpf_cidadao, '\\D', '', 'g');

UPDATE public.profiles SET cpf = regexp_replace(cpf, '\\D', '', 'g')
WHERE cpf IS NOT NULL AND cpf <> regexp_replace(cpf, '\\D', '', 'g');

-- 4) Protocolo passa a ser gerado exclusivamente pelo PostgreSQL.
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

-- 5) RLS: cidadão não recebe SELECT amplo da tabela sensível.
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção de chamados por qualquer usuário" ON public.chamados;
DROP POLICY IF EXISTS "Permitir leitura de chamados" ON public.chamados;
DROP POLICY IF EXISTS "Permitir atualização por administradores e fiscais" ON public.chamados;
DROP POLICY IF EXISTS "Permitir exclusão por administradores" ON public.chamados;

CREATE POLICY "chamados_insert_publico" ON public.chamados
  FOR INSERT TO anon, authenticated
  WITH CHECK (auth.uid() IS NULL OR cidadao_id = auth.uid());

CREATE POLICY "chamados_select_proprio" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    cidadao_id = auth.uid()
    OR public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente')
  );

CREATE POLICY "chamados_update_equipe" ON public.chamados
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente'))
  WITH CHECK (public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente'));

CREATE POLICY "chamados_delete_admin" ON public.chamados
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- 6) RPC segura para consulta pública por protocolo. Retorna apenas dados necessários.
CREATE OR REPLACE FUNCTION public.consultar_chamado_publico(p_protocolo TEXT)
RETURNS TABLE (
  protocolo TEXT,
  categoria_servico TEXT,
  descricao TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.protocolo::TEXT, c.categoria_servico::TEXT, c.descricao::TEXT,
         c.status::TEXT, c.created_at, c.updated_at
  FROM public.chamados c
  WHERE lower(c.protocolo) = lower(trim(p_protocolo))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamado_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamado_publico(TEXT) TO anon, authenticated;

-- RPC segura após abertura, usando UUID que o servidor acabou de gerar.
CREATE OR REPLACE FUNCTION public.consultar_chamado_publico_por_id(p_id UUID)
RETURNS TABLE (
  id UUID,
  protocolo TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.protocolo::TEXT, c.status::TEXT, c.created_at
  FROM public.chamados c
  WHERE c.id = p_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamado_publico_por_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamado_publico_por_id(UUID) TO anon, authenticated;

-- 7) portal_config: leitura pública, escrita apenas admin.
ALTER TABLE public.portal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura da configuração do portal" ON public.portal_config;
DROP POLICY IF EXISTS "Permitir atualização da configuração do portal" ON public.portal_config;
DROP POLICY IF EXISTS "Permitir inserção da configuração do portal" ON public.portal_config;

CREATE POLICY "portal_config_public_read" ON public.portal_config
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "portal_config_admin_write" ON public.portal_config
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "portal_config_admin_update" ON public.portal_config
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- updated_at de profiles/configuração.
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_portal_config_updated_at ON public.portal_config;
CREATE TRIGGER trigger_portal_config_updated_at
  BEFORE UPDATE ON public.portal_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
