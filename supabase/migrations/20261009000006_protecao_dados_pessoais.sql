-- =====================================================================
-- Conecta Trindade - proteção de dados pessoais (LGPD)
-- =====================================================================
-- Antes: qualquer servidor logado (atendente, gestor, fiscal) conseguia,
-- pela API, ler o cadastro de TODOS os usuários (CPF, e-mail, telefone) e
-- o CPF de todos os cidadãos nas O.S., mesmo sem isso aparecer na tela.
--
-- Agora:
--   - cadastro completo (profiles): só o próprio usuário e o admin;
--   - a equipe vê dos coordenadores só o necessário para encaminhar
--     (nome, telefone e serviços), pela função equipe_coordenadores();
--   - CPF do cidadão nas O.S.: ninguém lê pela API; o admin consulta pela
--     função cpf_cidadao_os(). Nome e telefone continuam visíveis para a
--     equipe, que precisa falar com o cidadão.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cadastro de usuários: só o próprio e o admin
-- ---------------------------------------------------------------------
ALTER POLICY "profiles_select" ON public.profiles
  USING (auth.uid() = id OR public.is_admin());

-- O que a equipe precisa saber dos coordenadores para encaminhar O.S.
CREATE OR REPLACE FUNCTION public.equipe_coordenadores()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  telefone TEXT,
  servicos TEXT[],
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome, p.telefone, p.servicos, p.status
  FROM public.profiles p
  WHERE p.role = 'coordenador'
    AND public.is_staff()
  ORDER BY p.nome;
$$;

REVOKE ALL ON FUNCTION public.equipe_coordenadores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipe_coordenadores() TO authenticated;

-- ---------------------------------------------------------------------
-- 2. CPF do cidadão: fora da leitura pela API
--    Permissão por coluna: o usuário logado lê todas as colunas da O.S.,
--    menos cpf_cidadao. (O RLS continua decidindo QUAIS O.S. cada um vê.)
--    Gravar continua igual: o cidadão informa o CPF ao abrir o chamado.
--
--    ATENÇÃO: coluna nova em chamados precisa entrar neste GRANT para a
--    equipe conseguir ler.
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.chamados FROM anon, authenticated;

GRANT SELECT (
  id, protocolo, nome_cidadao, telefone_cidadao, categoria_servico, descricao,
  endereco, foto_url, status, secretaria, prioridade, sla_limite,
  observacoes_internas, resposta_cidadao, latitude, longitude, cidadao_id,
  coordenador_id, na_secretaria_em, encaminhado_em, iniciado_em, executado_em,
  concluido_em, motivo_acao, visualizado_em, foto_execucao_url,
  created_at, updated_at
) ON public.chamados TO authenticated;

-- A view antiga "solicitacoes" (SELECT * de chamados) não é usada pelo app
-- e passaria a falhar; fica sem acesso pela API.
REVOKE ALL ON public.solicitacoes FROM anon, authenticated;

-- CPF de uma O.S., só para o admin (ex.: pedido formal de informação)
CREATE OR REPLACE FUNCTION public.cpf_cidadao_os(p_chamado UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Só o administrador pode ver o CPF do cidadão';
  END IF;
  RETURN (SELECT cpf_cidadao FROM public.chamados WHERE id = p_chamado);
END;
$$;

REVOKE ALL ON FUNCTION public.cpf_cidadao_os(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cpf_cidadao_os(UUID) TO authenticated;
