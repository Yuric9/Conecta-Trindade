/*
  Compatibilidade temporária do Storage.

  O controle de escrita/alteração/exclusão do bucket chamados-fotos já foi
  restringido à pasta do próprio usuário na migration de hardening.

  Mantemos leitura pública temporariamente porque a versão atual do frontend
  grava URLs públicas diretamente em chamados.fotos. A migração para bucket
  privado + signed URLs deve ser feita junto da refatoração das telas que
  exibem fotos, evitando quebrar chamados existentes.
*/

UPDATE storage.buckets
SET public = true
WHERE id = 'chamados-fotos';

DROP POLICY IF EXISTS "storage_select_chamados_fotos" ON storage.objects;
CREATE POLICY "storage_select_chamados_fotos" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'chamados-fotos');
