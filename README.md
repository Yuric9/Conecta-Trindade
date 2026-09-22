# Conecta-Trindade

Aplicativo de zeladoria urbana para a Prefeitura de Trindade.

## Requisitos

- Node.js 18+
- npm
- Projeto Supabase configurado

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (opcional, usado em metadata)
3. Instale as dependências:
   - `npm install`
4. Aplique as migrations da pasta `supabase/migrations` na ordem cronológica.
5. Inicie:
   - `npm run dev`

O Supabase é obrigatório para as rotas de produção. Não existe fallback silencioso de banco em produção e não há credenciais ou seeds fictícios no código.

## Banco e autenticação

- Supabase Auth é a fonte de autenticação.
- `public.profiles` vincula cada usuário do Auth à sua role.
- Novos usuários recebem role `cidadao` por padrão.
- A promoção para `admin` é manual no Supabase usando o UUID real da conta.
- Roles administrativas não são inferidas por e-mail.
- RLS restringe chamados e configurações conforme a role.
- Consultas públicas por protocolo retornam somente dados de acompanhamento.
- CPF exige autenticação e é normalizado para dígitos.

## Migrations

Aplique os arquivos de `supabase/migrations` em ordem de data. A migration `20260921000004_remove_demo_seed_data.sql` limpa somente os registros de demonstração conhecidos que possam existir em um banco que já recebeu a migration inicial antiga.

O arquivo `supabase/schema.sql` representa o modelo-base atual e não contém dados fictícios.

## Vercel

Configure no projeto Vercel, em Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (opcional)

Nunca configure `SUPABASE_SERVICE_ROLE_KEY` no frontend e nunca commite secrets.

## Scripts

- `npm run dev` — modo desenvolvimento
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm run build` — build de produção
- `npm run start` — servidor de produção
