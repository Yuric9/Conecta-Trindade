# Primeiro administrador do Conecta Trindade

## Regra de segurança

O cadastro público nunca cria administradores. Toda conta criada pela tela
`/login` nasce como `cidadao` (gatilho `handle_new_user`). A permissão vem
**somente** da coluna `role` da tabela `public.profiles`, nunca do e-mail.

Papéis existentes: `admin`, `gestor`, `fiscal`, `atendente` (servidores
municipais), `coordenador` e `cidadao`.

O `coordenador` recebe as O.S. dos serviços marcados no cadastro dele
(coluna `profiles.servicos`). Ele não é "servidor" para as regras de leitura
(`is_staff()`): não enxerga todas as O.S. nem os dados pessoais completos.

## Fluxo da O.S.

```
Pendente (nova) ──► Na Secretaria ──► Encaminhada ──► Em Andamento ──► Aguardando Confirmação ──► Concluído
  central analisa     Secretaria de      com o            coordenador       coordenador terminou         Secretaria
  e envia             Infraestrutura     coordenador                                                      confirma
```

`Cancelado`: só a central (O.S. nova) ou o admin, sempre com motivo.

### Quem faz cada passo (função + lotação no cadastro)

| Papel | Cadastro | Pode |
|---|---|---|
| Admin | `admin` | tudo |
| Central de atendimento | `atendente` **sem** secretaria | Nova → Na Secretaria; cancelar O.S. nova |
| Secretaria de Infraestrutura | `gestor`, ou `atendente` com secretaria `INFRAESTRUTURA` | escolher/trocar coordenador, marcar etapas, confirmar a conclusão, devolver à central, recusar a execução |
| Coordenador | `coordenador` | iniciar, executar, devolver à Secretaria |

As regras ficam no gatilho `chamado_fluxo_os` (migration `20261009000005`,
função `papel_os()`): não deixa encaminhar sem coordenador, exige motivo para
cancelar, devolver, recusar ou tirar do coordenador, grava a data de cada
etapa e registra tudo em `chamado_historico`, que só pode ser lido.

### A central fala com o cidadão (migration `20261009000007`)

- **Resposta ao cidadão** (`resposta_cidadao`): só a central e o admin
  escrevem; aparece para o cidadão em "Acompanhar". Fica a data
  (`respondido_em`) e o registro no histórico. Fila "Responder ao cidadão":
  O.S. concluídas ou canceladas sem resposta.
- **Cobrança**: quando o cidadão cobra, a central registra pela função
  `registrar_cobranca()` (só O.S. que já estão com a Secretaria). Vai para o
  histórico e a Secretaria vê o selo "Cobrada" (`cobrado_em`, `cobrancas`).

## Proteção de dados pessoais (LGPD)

Migration `20261009000006`:

| Dado | Quem lê |
|---|---|
| Cadastro completo (`profiles`: CPF, e-mail, telefone) | o próprio usuário e o admin |
| Nome, telefone e serviços dos coordenadores | equipe, pela função `equipe_coordenadores()` |
| CPF do cidadão na O.S. | ninguém pela API; o admin pela função `cpf_cidadao_os()` |
| Nome e telefone do cidadão na O.S. | equipe e o coordenador da O.S. (para contato) |

O CPF fica de fora com permissão por coluna em `chamados`. **Coluna nova em
`chamados` precisa entrar no `GRANT SELECT (...)` dessa migration** (e na lista
`COLUNAS_PAINEL` de `app/api/chamados/route.ts`), senão a equipe não consegue ler.

## Tela do coordenador (`/coordenador`)

O coordenador entra pelo login normal e cai em "Minhas O.S.". Ele não lê a
tabela `chamados`: usa as funções `minhas_os()` (só as O.S. dele, com nome e
telefone do cidadão, sem CPF nem observações internas) e
`coordenador_atualizar_os()` (migration `20261009000003`), que permite:

- `visualizar`: registra no histórico que ele abriu a O.S. (uma vez)
- `iniciar`: Encaminhada → Em Andamento
- `executar`: → Aguardando Confirmação, com observação e foto opcionais
- `devolver`: volta para a central sem coordenador (motivo obrigatório)

Concluir continua sendo da atendente ou do secretário.

Para transformar uma conta em coordenador: a pessoa cria a conta em
"Cadastro cidadão"; um admin muda a função na aba Usuários para
"Coordenador de Serviço" e marca os serviços.

## Painel dos coordenadores (aba Coordenadores)

Para a central, a Secretaria e o admin (migration `20261009000008`):

- `painel_coordenadores()`: por coordenador, O.S. abertas, não vistas, em
  execução, atrasadas, esperando confirmação, concluídas em 30 dias e tempo
  médio entre encaminhar e executar. Conta direto no banco (todas as O.S.,
  não só as 100 que o painel carrega).
- Botão **Cobrar no WhatsApp** (só a Secretaria: secretário ou atendente
  da pasta, e o admin; a central só vê os números): abre a conversa com a lista das O.S. em
  aberto e chama `registrar_cobranca_coordenador()`, que guarda quem cobrou
  (tabela `cobrancas_coordenador`, sem acesso direto) e põe "Coordenador
  cobrado pelo WhatsApp" no histórico de cada O.S. aberta.

## O que o cidadão vê (migration `20261010000001`)

"Meus Chamados" (`meus_chamados_v2()`, só os pedidos da própria conta) e
"Acompanhar" (`consultar_chamados_publico_v3()`, **só pelo protocolo**,
só o primeiro nome; migration `20261010000003`) mostram:

- a situação resumida: Recebido, Em andamento, Concluído ou Cancelado;
- a linha do tempo: Recebido → Na Secretaria → Equipe em campo → Concluído,
  com as datas;
- a resposta da central e, depois de concluída, a foto do serviço feito.

Nunca mostram coordenador, observações internas, motivos da equipe, CPF ou
telefone. O site usa as versões antigas se as novas ainda não existirem.

## Relatórios (aba Relatórios; migration `20261010000004`)

`relatorio_os_dados(inicio, fim)` entrega à equipe ativa as O.S. abertas no
período, sem dados pessoais (sem nome, CPF, telefone ou descrição). A tela
calcula: recebidos, concluídos, em aberto, % dentro do prazo, tempo médio;
e os números por mês, por serviço, por coordenador e as ruas com mais
pedidos. Botão "Imprimir / PDF" gera a folha para levar à gestão.

## Aplicar as migrations

No Supabase, rode os arquivos de `supabase/migrations/` em ordem (pelo
**SQL Editor**, um arquivo por vez, ou com `supabase db push` na CLI).

## Criar o primeiro administrador

1. Crie a conta normalmente pela aplicação.
2. No Supabase, abra **SQL Editor > New query**.
3. Promova a conta (troque o e-mail):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'seu-email@exemplo.com';
```

4. Confirme:

```sql
SELECT id, email, nome, role
FROM public.profiles
WHERE email = 'seu-email@exemplo.com';
```

5. Saia da aplicação, entre novamente pelo portal do servidor e acesse `/admin`.

O SQL Editor roda como superusuário, por isso consegue promover a primeira
conta. Pelo aplicativo, só quem já é `admin` consegue alterar o `role` de
alguém: o gatilho `protect_profile_role` bloqueia a autopromoção.

## Proteções contra abuso (migration `20261010000002`)

- Usuário **desativado** perde o acesso no banco na hora (`is_staff()` e
  `is_admin()` só contam quem está ativo).
- Só o admin muda função, lotação, serviços e ativo/inativo de alguém.
- Pedidos: CPF com 11 dígitos, textos com tamanho máximo, foto só JPG/PNG/WebP
  (até ~2 MB) ou link https.
- Limite de envio: 5 pedidos por CPF por hora e 40 pedidos no site a cada
  10 minutos (a equipe não tem limite). A data do pedido é sempre a do servidor.

## O que não fazer

- Não liberar acesso de admin pelo e-mail (ex.: "contém admin").
- Não confiar em `raw_user_meta_data.role` para autorização.
- Não criar política RLS que permita ao próprio cidadão alterar `role`.
- Não colocar a chave `service_role` no frontend nem no repositório.
- Não colocar senhas no código.

## Cadastrar servidores pelo painel (aba Usuários)

O botão "Cadastrar Novo Usuário" cria a conta de login pela rota
`POST /api/usuarios`, que só o admin pode usar. Criar conta para outra pessoa
exige a chave secreta do Supabase, que fica **só no servidor**:

1. Supabase → **Project Settings → API Keys** → copie a chave **secret**
   (ou a antiga `service_role`).
2. Vercel → projeto → **Settings → Environment Variables** → adicione
   `SUPABASE_SERVICE_ROLE_KEY` com essa chave (ambiente Production e Preview).
3. Faça um novo deploy (Deployments → ⋯ → Redeploy) para a variável valer.

Nunca coloque essa chave no código, no `.env` versionado nem com o prefixo
`NEXT_PUBLIC_` (que a enviaria para o navegador). Ela ignora todas as regras
de segurança do banco.

## Senhas

Ninguém vê senha, nem o admin: o Supabase guarda só o hash (um "embaralhado"
que não dá para desfazer).

- **Esqueci minha senha** (`/esqueci-senha`, link na tela de login): qualquer
  pessoa recebe no e-mail um link que abre `/redefinir-senha`.
- **Trocar minha senha**: no Perfil, para quem já está logado.
- **Definir nova senha** (aba Usuários, ícone de chave): o admin define uma
  senha nova para contas da **equipe** (rota `POST /api/usuarios/senha`, usa a
  mesma `SUPABASE_SERVICE_ROLE_KEY`). Conta de cidadão é recusada: o cidadão
  usa "Esqueci minha senha".

Para o link do e-mail funcionar, no Supabase → **Authentication → URL
Configuration**:

1. **Site URL**: `https://conecta-trindade.vercel.app`
2. **Redirect URLs**: adicione `https://conecta-trindade.vercel.app/redefinir-senha`

O e-mail padrão do Supabase tem limite baixo de envios por hora. Com muitos
usuários, configure um SMTP próprio em **Authentication → SMTP Settings**.
