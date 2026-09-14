# Conecta-Trindade

Aplicativo de zeladoria urbana para a Prefeitura de Trindade.

## Requisitos

- Node.js 18+
- npm

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha as variáveis do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Instale as dependências:
   - `npm install`
4. Inicie a aplicação:
   - `npm run dev`

Se as variáveis do Supabase não estiverem configuradas, a aplicação entra em modo demo para evitar falhas na inicialização e continuar navegável localmente.

## Scripts

- `npm run dev` — modo desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servidor de produção