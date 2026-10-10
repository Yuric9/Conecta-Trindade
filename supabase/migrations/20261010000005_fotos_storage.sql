-- =====================================================================
-- Fotos das O.S. no Storage (fora do banco)
--
-- Antes a foto ia dentro da tabela, como texto (~300 KB cada): o banco
-- gratuito (500 MB) encheria com ~1.500 pedidos com foto, e o painel
-- baixava todas as fotos de uma vez. Agora a foto fica no Storage
-- (bucket privado "fotos-os") e a tabela guarda só o endereço dela.
--
-- Pastas: fotos-os/<id da O.S.>/cidadao-....jpg  (foto do pedido)
--         fotos-os/<id da O.S.>/execucao-....jpg (foto do serviço feito)
--
-- Quem grava: só o servidor do site (chave secreta), depois de conferir
-- o pedido ou o coordenador. Ninguém grava direto.
-- Quem vê (link temporário): a equipe ativa; o coordenador da O.S.; o
-- cidadão dono do pedido (a foto do serviço feito só depois de concluída).
-- A consulta pública pelo protocolo recebe o link pelo servidor.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fotos-os', 'fotos-os', false, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Pode ver esta foto? (função com permissão própria: o coordenador e o
-- cidadão não leem a tabela chamados diretamente)
CREATE OR REPLACE FUNCTION public.pode_ver_foto_os(p_nome TEXT)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partes TEXT[] := string_to_array(p_nome, '/');
  os RECORD;
BEGIN
  IF auth.uid() IS NULL OR array_length(partes, 1) <> 2 THEN
    RETURN false;
  END IF;
  IF public.is_staff() THEN
    RETURN true;
  END IF;
  IF partes[1] !~ '^[0-9a-f-]{36}$' THEN
    RETURN false;
  END IF;

  SELECT c.coordenador_id, c.cidadao_id, c.status INTO os
  FROM public.chamados c WHERE c.id = partes[1]::uuid;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Coordenador da O.S. (ativo)
  IF os.coordenador_id = auth.uid() AND public.papel_os(auth.uid()) = 'coordenador' THEN
    RETURN true;
  END IF;

  -- Cidadão dono do pedido: a própria foto sempre; a do serviço feito depois de concluída
  IF os.cidadao_id = auth.uid() THEN
    RETURN partes[2] LIKE 'cidadao-%' OR os.status = 'Concluído';
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.pode_ver_foto_os(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_foto_os(TEXT) TO authenticated;

-- Só leitura (para gerar o link temporário). Gravar e apagar: só o servidor.
CREATE POLICY "fotos_os_ver"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'fotos-os' AND public.pode_ver_foto_os(name));
