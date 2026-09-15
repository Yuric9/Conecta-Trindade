-- =====================================================================
-- Conecta Trindade - Cadastro do Administrador Principal
-- =====================================================================
-- Execute este script no SQL Editor do Supabase se estiver conectando
-- com o seu projeto Supabase real.
--
-- Administrador solicitado:
-- E-mail: yure-c@hotmail.com
-- =====================================================================

-- 1. Se o usuário já criou a conta pelo site (/login), promove para admin:
UPDATE public.profiles
SET role = 'admin',
    nome = 'Gestor Municipal (Admin)'
WHERE email = 'yure-c@hotmail.com';

-- 2. Verificação do status:
SELECT id, email, nome, role, created_at
FROM public.profiles
WHERE email = 'yure-c@hotmail.com';
