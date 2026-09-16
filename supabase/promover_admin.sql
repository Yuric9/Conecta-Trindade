-- =====================================================================
-- Conecta Trindade - Promover um usuário a administrador
-- =====================================================================
-- O papel de administrador vive APENAS na coluna public.profiles.role.
-- Não existe administrador definido pelo código da aplicação.
--
-- Como usar:
-- 1. A pessoa cria a conta normalmente em /login (Supabase Auth).
-- 2. Troque o e-mail abaixo e execute este script no SQL Editor do Supabase.
-- 3. A pessoa sai e entra de novo na aplicação para carregar o novo papel.
--
-- Garanta que as policies de RLS de profiles impeçam o próprio usuário
-- de alterar a coluna role — caso contrário a promoção pode ser forjada
-- pelo cliente.
-- =====================================================================

-- Troque pelo e-mail que deve virar administrador:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'troque-por-seu-email@exemplo.com';

-- Conferir quem tem acesso de administrador hoje:
SELECT id, email, nome, role, created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at;
