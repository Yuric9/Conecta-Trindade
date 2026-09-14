# Primeiro administrador do Conecta Trindade

## Regra de segurança

O cadastro público nunca cria administradores. Toda conta criada pela tela `/login` nasce como `cidadao`.

O primeiro administrador é promovido manualmente no SQL Editor do Supabase. Depois que existir um administrador, a função `public.set_user_role(uuid, text)` permite que administradores alterem a função de outros usuários.

## Criar o primeiro administrador

1. Crie a conta normalmente pela aplicação.
2. No Supabase, abra **SQL Editor > New query**.
3. Localize o usuário:

```sql
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;
```

4. Confira o perfil correspondente:

```sql
SELECT id, nome, role
FROM public.profiles
WHERE id = 'ID_DO_USUARIO';
```

5. Promova somente o usuário escolhido:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'ID_DO_USUARIO';
```

6. Confirme:

```sql
SELECT id, nome, role
FROM public.profiles
WHERE id = 'ID_DO_USUARIO';
```

O resultado deve mostrar `role = admin`.

7. Saia da aplicação, entre novamente e acesse `/admin`.

## Administradores adicionais

Depois do primeiro administrador, a alteração deve ser feita pela função protegida:

```sql
SELECT public.set_user_role('ID_DO_USUARIO', 'admin');
```

Para retirar a função:

```sql
SELECT public.set_user_role('ID_DO_USUARIO', 'cidadao');
```

Essa função só executa quando o usuário autenticado já é administrador.

## O que não fazer

- Não adicionar `role: 'admin'` ao formulário público.
- Não confiar em `raw_user_meta_data.role` para autorização.
- Não criar política RLS que permita ao próprio cidadão alterar `role`.
- Não colocar a chave `service_role` no frontend.

## Hardening aplicado

A migration `20260914190000_security_hardening_and_admin.sql` adiciona:

- verificação centralizada de admin;
- proteção contra autoelevação de `cidadao` para `admin`;
- restrição de campos administrativos dos chamados;
- exclusão de chamados pelo cidadão somente enquanto `ABERTO`;
- protocolo atômico usando sequence;
- verificação de chamados duplicados no banco;
- função segura para gestão de roles;
- políticas de Storage com pasta vinculada ao ID do usuário.

A leitura pública das fotos permanece temporariamente compatível com a versão atual do frontend. A migração para bucket privado + signed URLs deve ser feita em uma etapa específica de refatoração das telas que exibem fotos.
