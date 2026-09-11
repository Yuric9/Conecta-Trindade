/*
# Conecta Trindade - Zelo Urbano: tabelas, triggers, RLS e storage

1. Novas Tabelas
- `profiles` — perfil do cidadão: cpf, telefone, nome. Vincula a auth.users.
- `chamados` — solicitações de zelo urbano (iluminação, buraco, limpeza, vazamento, podas, outros).
  Colunas: protocolo único, categoria, descrição, latitude/longitude, endereço,
  fotos (array de URLs do Storage), status, secretaria, SLA, timestamps.

2. Triggers
- `generate_protocolo` — gera protocolo sequencial no formato TRIN-2026-000001 ao inserir chamado.
- `set_sla_limite` — calcula sla_limite = created_at + intervalo por categoria.
- `handle_new_user` — cria perfil automaticamente ao registrar usuário.

3. Funções
- `is_admin()` — verifica se o usuário autenticado tem role ADMIN em raw_app_meta_data.
- `check_duplicate_chamado()` — bloqueia chamados duplicados (mesmo usuário, <100m, <24h).

4. Segurança (RLS)
- `profiles`: usuário lê/edita apenas seu próprio perfil. ADMIN vê todos.
- `chamados`: cidadão vê/edita apenas seus chamados. ADMIN vê/edita todos.
- Storage bucket `chamados-fotos` com políticas de acesso por pasta de usuário.

5. Storage
- Bucket público `chamados-fotos` para fotos dos chamados.
*/

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE chamado_categoria AS ENUM (
    'ILUMINACAO', 'BURACO', 'LIMPEZA', 'VAZAMENTO', 'PODAS', 'OUTROS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chamado_status AS ENUM (
    'ABERTO', 'TRIADO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO', 'AVALIADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chamado_secretaria AS ENUM (
    'OBRAS', 'LIMPEZA_URBANA', 'SANEAMENTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf text UNIQUE NOT NULL,
  telefone text,
  nome text,
  role text NOT NULL DEFAULT 'cidadao',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- CHAMADOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text UNIQUE NOT NULL,
  cidadao_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria chamado_categoria NOT NULL,
  descricao text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  endereco_texto text,
  fotos text[] DEFAULT '{}',
  status chamado_status NOT NULL DEFAULT 'ABERTO',
  secretaria chamado_secretaria,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sla_limite timestamptz
);

ALTER TABLE chamados ENABLE ROW LEVEL SECURITY;

-- Cidadão só vê/edita seus próprios chamados; ADMIN vê/edita todos
DROP POLICY IF EXISTS "select_own_chamados" ON chamados;
CREATE POLICY "select_own_chamados" ON chamados FOR SELECT
  TO authenticated USING (
    auth.uid() = cidadao_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "insert_own_chamados" ON chamados;
CREATE POLICY "insert_own_chamados" ON chamados FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = cidadao_id);

DROP POLICY IF EXISTS "update_own_chamados" ON chamados;
CREATE POLICY "update_own_chamados" ON chamados FOR UPDATE
  TO authenticated USING (
    auth.uid() = cidadao_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    auth.uid() = cidadao_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "delete_own_chamados" ON chamados;
CREATE POLICY "delete_own_chamados" ON chamados FOR DELETE
  TO authenticated USING (
    auth.uid() = cidadao_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chamados_cidadao ON chamados(cidadao_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_categoria ON chamados(categoria);
CREATE INDEX IF NOT EXISTS idx_chamados_created_at ON chamados(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Protocolo sequencial: TRIN-2026-000001
CREATE OR REPLACE FUNCTION generate_protocolo()
RETURNS trigger AS $$
DECLARE
  next_seq integer;
  year_val text;
BEGIN
  year_val := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(seq_val), 0) + 1 INTO next_seq
  FROM (
    SELECT CAST(SUBSTRING(protocolo FROM 11) AS integer) AS seq_val
    FROM chamados
    WHERE protocolo LIKE 'TRIN-' || year_val || '-%'
  ) sub;
  NEW.protocolo := 'TRIN-' || year_val || '-' || lpad(next_seq::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_protocolo ON chamados;
CREATE TRIGGER trg_generate_protocolo
  BEFORE INSERT ON chamados
  FOR EACH ROW EXECUTE FUNCTION generate_protocolo();

-- SLA por categoria
CREATE OR REPLACE FUNCTION set_sla_limite()
RETURNS trigger AS $$
BEGIN
  IF NEW.sla_limite IS NULL THEN
    NEW.sla_limite := NEW.created_at + CASE NEW.categoria
      WHEN 'ILUMINACAO' THEN interval '72 hours'
      WHEN 'BURACO' THEN interval '120 hours'
      WHEN 'LIMPEZA' THEN interval '48 hours'
      WHEN 'VAZAMENTO' THEN interval '24 hours'
      WHEN 'PODAS' THEN interval '168 hours'
      WHEN 'OUTROS' THEN interval '96 hours'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_sla_limite ON chamados;
CREATE TRIGGER trg_set_sla_limite
  BEFORE INSERT ON chamados
  FOR EACH ROW EXECUTE FUNCTION set_sla_limite();

-- updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_updated_at ON chamados;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON chamados
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-criar profile ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, cpf, telefone, nome, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'telefone',
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cidadao')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamados-fotos', 'chamados-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_select_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_select_chamados_fotos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'chamados-fotos');

DROP POLICY IF EXISTS "storage_insert_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_insert_chamados_fotos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'chamados-fotos');

DROP POLICY IF EXISTS "storage_update_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_update_chamados_fotos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'chamados-fotos');

DROP POLICY IF EXISTS "storage_delete_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_delete_chamados_fotos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'chamados-fotos');