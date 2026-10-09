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

## O que não fazer

- Não liberar acesso de admin pelo e-mail (ex.: "contém admin").
- Não confiar em `raw_user_meta_data.role` para autorização.
- Não criar política RLS que permita ao próprio cidadão alterar `role`.
- Não colocar a chave `service_role` no frontend nem no repositório.
- Não colocar senhas no código.
