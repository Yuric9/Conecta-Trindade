-- Conecta Trindade - schema base para Supabase/PostgreSQL
-- Sem seeds ou dados fictícios. Credenciais são configuradas fora do Git.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_chamado') THEN
    CREATE TYPE status_chamado AS ENUM ('Pendente','Em Análise','Em Andamento','Concluído','Cancelado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cpf TEXT,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'cidadao' CHECK (role IN ('admin','servidor','fiscal','gestor','atendente','cidadao')),
  secretaria TEXT,
  cargo TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','bloqueado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE SEQUENCE IF NOT EXISTS chamado_protocolo_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidadao_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  protocolo VARCHAR(30) UNIQUE NOT NULL,
  nome_cidadao VARCHAR(255) NOT NULL,
  cpf_cidadao VARCHAR(11) NOT NULL,
  telefone_cidadao VARCHAR(20) NOT NULL DEFAULT '',
  categoria_servico VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  endereco TEXT NOT NULL,
  foto_url TEXT,
  status status_chamado NOT NULL DEFAULT 'Pendente',
  observacoes_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chamados_cidadao_id ON public.chamados(cidadao_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_categoria ON public.chamados(categoria_servico);
CREATE INDEX IF NOT EXISTS idx_chamados_created_at ON public.chamados(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_cpf_cidadao ON public.chamados(cpf_cidadao);

CREATE TABLE IF NOT EXISTS public.portal_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  menu_contexto_cards_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.portal_config (id, menu_contexto_cards_ativo)
VALUES (1, TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_chamados_updated_at ON public.chamados;
CREATE TRIGGER trigger_chamados_updated_at BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_portal_config_updated_at ON public.portal_config;
CREATE TRIGGER trigger_portal_config_updated_at BEFORE UPDATE ON public.portal_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
CREATE TRIGGER trigger_chamados_auto_protocolo BEFORE INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.gerar_protocolo_chamado();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, cpf, telefone, role)
  VALUES (
    NEW.id, COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\\D', '', 'g'), ''),
    NULLIF(NEW.raw_user_meta_data->>'telefone', ''), 'cidadao'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente'));

DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;
CREATE POLICY "profiles_admin_write" ON public.profiles FOR ALL TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "chamados_insert_publico" ON public.chamados;
CREATE POLICY "chamados_insert_publico" ON public.chamados FOR INSERT TO anon, authenticated
WITH CHECK (auth.uid() IS NULL OR cidadao_id = auth.uid());

DROP POLICY IF EXISTS "chamados_select_proprio" ON public.chamados;
CREATE POLICY "chamados_select_proprio" ON public.chamados FOR SELECT TO authenticated
USING (cidadao_id = auth.uid() OR public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente'));

DROP POLICY IF EXISTS "chamados_update_equipe" ON public.chamados;
CREATE POLICY "chamados_update_equipe" ON public.chamados FOR UPDATE TO authenticated
USING (public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente'))
WITH CHECK (public.get_current_user_role() IN ('admin','servidor','fiscal','gestor','atendente'));

DROP POLICY IF EXISTS "chamados_delete_admin" ON public.chamados;
CREATE POLICY "chamados_delete_admin" ON public.chamados FOR DELETE TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE OR REPLACE VIEW public.solicitacoes AS SELECT * FROM public.chamados;

CREATE OR REPLACE FUNCTION public.consultar_chamado_publico(p_protocolo TEXT)
RETURNS TABLE (protocolo TEXT, categoria_servico TEXT, descricao TEXT, status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.protocolo::TEXT, c.categoria_servico::TEXT, c.descricao::TEXT, c.status::TEXT, c.created_at, c.updated_at
  FROM public.chamados c WHERE lower(c.protocolo) = lower(trim(p_protocolo)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamado_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamado_publico(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.consultar_chamado_publico_por_id(p_id UUID)
RETURNS TABLE (id UUID, protocolo TEXT, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.protocolo::TEXT, c.status::TEXT, c.created_at FROM public.chamados c WHERE c.id = p_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.consultar_chamado_publico_por_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_chamado_publico_por_id(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.consultar_meus_chamados_por_cpf(p_cpf TEXT)
RETURNS TABLE (id UUID, protocolo TEXT, categoria_servico TEXT, descricao TEXT, status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.protocolo::TEXT, c.categoria_servico::TEXT, c.descricao::TEXT, c.status::TEXT, c.created_at, c.updated_at
  FROM public.chamados c JOIN public.profiles p ON p.id = auth.uid()
  WHERE auth.uid() IS NOT NULL AND c.cidadao_id = auth.uid()
    AND p.cpf = regexp_replace(COALESCE(p_cpf,''), '\\D', '', 'g')
  ORDER BY c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.consultar_meus_chamados_por_cpf(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_meus_chamados_por_cpf(TEXT) TO authenticated;

DROP POLICY IF EXISTS "portal_config_public_read" ON public.portal_config;
CREATE POLICY "portal_config_public_read" ON public.portal_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "portal_config_admin_write" ON public.portal_config;
CREATE POLICY "portal_config_admin_write" ON public.portal_config FOR INSERT TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "portal_config_admin_update" ON public.portal_config;
CREATE POLICY "portal_config_admin_update" ON public.portal_config FOR UPDATE TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

-- O bucket 'chamados-fotos' deve ser criado no Supabase Storage e configurado
-- como privado. As políticas de storage devem permitir upload apenas conforme
-- a regra de negócio definida para o usuário autenticado.
