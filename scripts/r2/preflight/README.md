# `scripts/r2/preflight/` — auditoria remota e read-only de staging

Lê o banco de staging e devolve um relatório. **Não escreve.** Não aplica migration, não
faz backfill, não valida constraint, não toca em RLS, e não existe caminho aqui que
alcance produção.

Roda por [`.github/workflows/r2-staging-preflight.yml`](../../../.github/workflows/r2-staging-preflight.yml),
**só** por `workflow_dispatch`, no GitHub Environment `staging`.

---

## Por que existe

A R2.2 mediu staging com a chave **anônima** — a mesma que o site público usa — e bateu
no teto dela. Índices, constraints, funções, policies, grants, linhas inativas e o
histórico de migrations são todos invisíveis para `anon`, e isso é o comportamento
correto, não um defeito. O resultado foi um gate com três `UNKNOWN` que não eram sobre o
banco: eram sobre a medição. Ver [`docs/evidence/r2/staging/preflight.md`](../../../docs/evidence/r2/staging/preflight.md).

Este preflight fecha essa lacuna com uma credencial que enxerga o catálogo — e é
justamente por isso que a garantia de read-only precisa ser estrutural.

---

## A garantia de read-only, em três camadas

A suposição perigosa seria "a credencial é read-only". Ela não é: o único papel que
enxerga `supabase_migrations.schema_migrations` também escreve em tudo. Então a garantia
vem de outro lugar, e de três lugares independentes:

| Camada              | Onde                                                          | O que impede                                                 |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| **A. Estática**     | [`read-only-guard.ts`](./read-only-guard.ts)                  | verbo de escrita nos `.sql`, antes de abrir conexão          |
| **B. Transacional** | [`_prologue.sql`](./_prologue.sql)                            | `BEGIN; SET TRANSACTION READ ONLY;` — o banco recusa escrita |
| **C. Verificação**  | primeira consulta de [`00-structure.sql`](./00-structure.sql) | confirma no banco que B pegou; o runner aborta se não        |

A camada A roda **duas vezes**: em `bun run test` e dentro do próprio workflow, segundos
antes do `psql`. As duas importam por motivos diferentes — um teste que só roda no CI
protege o repositório, não o banco.

---

## Os arquivos

| Arquivo                                                                 | O que é                                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`_prologue.sql`](./_prologue.sql) / [`_epilogue.sql`](./_epilogue.sql) | abrem e fecham a transação read-only. Nunca rodam sozinhos                 |
| [`00-structure.sql`](./00-structure.sql)                                | só catálogo: colunas, constraints, índices, funções, grants, RLS, policies |
| [`10-migration-history.sql`](./10-migration-history.sql)                | histórico de migrations. Só roda se a tabela existir                       |
| [`20-content.sql`](./20-content.sql)                                    | contagens agregadas e auditoria de GTIN                                    |
| [`30-quantity-input.sql`](./30-quantity-input.sql)                      | entrada do preview de quantidade                                           |
| [`read-only-guard.ts`](./read-only-guard.ts)                            | camada A                                                                   |
| [`preview-counts.ts`](./preview-counts.ts)                              | reduz o preview de backfill a contagens por estado                         |
| [`render-summary.ts`](./render-summary.ts)                              | classifica histórico, dados e gates, e escreve o Job Summary               |
| [`prepare-credential.sh`](./prepare-credential.sh)                      | resolve host/porta/usuário/banco e escreve o `.pgpass` 0600                |
| [`diagnose-connection.sh`](./diagnose-connection.sh)                    | lê o erro do psql e diz se a falha foi de **rede** ou de **credencial**    |
| [`run.sh`](./run.sh)                                                    | conecta, executa e guarda fatos                                            |
| [`preflight.test.ts`](./preflight.test.ts)                              | 84 testes sobre read-only, sigilo, classificação e desenho do workflow     |
| [`prepare-credential.test.ts`](./prepare-credential.test.ts)            | 46 testes que **executam** a cadeia de credencial em bash                  |
| [`diagnose-connection.test.ts`](./diagnose-connection.test.ts)          | 18 testes que **executam** o diagnóstico sobre erros reais de psql         |

`run.sh` é fino de propósito. Toda **decisão** mora em `render-summary.ts`, que tem
teste — decisão em shell é decisão sem teste.

---

## O que nunca sai daqui

Connection string, senha, token, host completo, GTIN completo, linha de tabela, dado
pessoal. O que se publica é um hash truncado do host mais os últimos caracteres do
project ref: dá para conferir **qual** ambiente foi lido, não dá para alcançá-lo.

Duas consequências práticas que talvez surpreendam:

- a saída de [`../target-readiness-pre.sql`](../target-readiness-pre.sql) **não é publicada**. A
  consulta 2 dele devolve GTIN completo. O script roda (é o §5.7 do mandato), mas o que
  se registra é o status; a auditoria equivalente, mascarada, sai de `20-content.sql`;
- o dump de produtos do preview é apagado, e só a **contagem por estado** entra no
  resumo. Nem o relatório linha a linha, nem o arquivo intermediário, nem artefato algum.

Mascarar acontece **no SQL**, não na renderização. Mascarar só no fim deixaria o código
completo no arquivo intermediário — que é exatamente onde ninguém procuraria depois.

---

## Produção é inalcançável, e isso é verificado

Tudo vem de [`config/environments.json`](../../../config/environments.json) — arquivo já
versionado, já público. Nada de host ou usuário vindo de segredo.

A cadeia de guarda de [`prepare-credential.sh`](prepare-credential.sh) **aborta** quando:

- qualquer um dos dois refs estiver ausente — uma comparação contra `""` casa sempre, e a
  recusa passaria calada;
- os dois refs forem **iguais** — nesse estado nenhuma guarda distingue os ambientes;
- `staging.supabaseDbHost` não estiver no arquivo;
- o usuário derivado **ou** o host versionado mencionar o ref de **produção**;
- o usuário derivado **não** contiver o ref de staging.

O quarto item deixou de ser tautológico quando o host passou a vir de fora da construção:
antes ele era uma asserção sobre o que o próprio código montava; agora é validação de um
valor que alguém edita à mão.

A cadeia inteira é **executada** em `prepare-credential.test.ts`, e não conferida por
regex sobre o texto do script.

---

## Não existe modo `apply`

E isso é desenho, não lacuna. Escrever em staging é missão própria, com gate humano
próprio ([`docs/data/R2-APPLICATION-GATE.md`](../../../docs/data/R2-APPLICATION-GATE.md)).

Pelo mesmo motivo, o workflow **não instala a CLI do Supabase**. O histórico de
migrations é lido por `SELECT` direto em `supabase_migrations.schema_migrations`, que
responde a mesma pergunta que `supabase migration list`. A diferença importa: assim o
runner nunca carrega uma ferramenta que também saiba aplicar migration.

---

## O segredo é atômico, e isso é o ponto

`SUPABASE_DB_PASSWORD`, como **Environment Secret** do ambiente `staging`, contendo
**somente a Database password** do projeto Supabase de staging. Nada de URI de conexão,
nada de host, nada de usuário, nunca a `service_role`, nunca a senha de produção.

Sem ele o workflow para com `STAGING DATABASE PASSWORD SECRET REQUIRED` e explica o que
falta — sem stack trace, sem abrir conexão, e **sem tentar nenhuma credencial
alternativa**. Um fallback aqui recriaria os dois caminhos de autenticação em paralelo
que este desenho existe para eliminar.

Os outros quatro parâmetros são derivados, e não cadastrados:

| Parâmetro | Valor                    | De onde vem                                       |
| --------- | ------------------------ | ------------------------------------------------- |
| host      | `staging.supabaseDbHost` | `config/environments.json`, versionado e público  |
| porta     | `5432`                   | constante — pooler em modo Session                |
| usuário   | `postgres.<staging-ref>` | **derivado** do ref versionado — carrega o tenant |
| banco     | `postgres`               | constante                                         |

### O host é o do pooler, e isso não é detalhe

A primeira versão de R2.3D derivava `db.<ref>.supabase.co`, a conexão **direta**. Isso foi
um defeito: esse host é **IPv6-only**, e runner do GitHub é **IPv4-only**. O
[run 31030456630](https://github.com/samuel3ssilva/vipreco/actions/runs/31030456630) morreu
em `Network is unreachable` contra um endereço `2600:...` — antes de qualquer autenticação.

O pooler em modo **Session** é IPv4, escuta na 5432 e exige o tenant no usuário. Por isso:

- o **host** vem do arquivo versionado (copiado de _Project Settings › Database › Connection
  string › Session pooler_; é público, não é segredo);
- o **usuário** é derivado, `postgres.<project-ref>`, e não configurável.

E daí decorre uma consequência que vale dizer em voz alta: **a identidade do ambiente vive no
usuário, não no host**. O host do pooler é compartilhado por região — dois projetos na mesma
região usam o mesmo hostname. Conferir o ambiente pelo host seria uma guarda que parece existir
e não existe.

### Por que o desenho anterior foi abandonado

O segredo antigo guardava a connection string inteira, e o runner a decompunha em tempo
de execução. Cinco defeitos saíram dessa decomposição: `+` virando espaço, `%` sem hex
válido, `\n` interpretado como formato em vez de dado, corte no primeiro `@` em vez do
último, e `read` com `IFS='='` comendo o `=` de padding do base64 — este último falhando
alto no GNU do CI e **mudo** no macOS de quem escreveu.

O que os une importa mais que cada um: **nenhum deles falha**. Todos entregam uma senha
silenciosamente diferente, e senha diferente volta do Postgres como
`password authentication failed` — a mesma mensagem de uma credencial de fato inválida.
Um defeito que se disfarça de problema do outro lado manda investigar o lugar errado, e
mandou, três vezes.

A lição não é "escrever um parser melhor". É que daqueles cinco campos, quatro já eram
conhecidos e versionados e só um era segredo. Montar os quatro conhecidos à mão, para
decompô-los de novo depois, criava superfície de erro do nada.

Com um segredo atômico não há URI, não há parsing, não há percent-encoding e não há
base64 — e portanto não há como essa classe de defeito voltar.

Nunca colar o valor em chat, em `.env` versionado, em `VITE_*` ou em issue. A senha vai
direto para um `.pgpass` de modo 0600 dentro do diretório efêmero do job, que o `trap` do
runner apaga inclusive quando o script falha no meio.

---

## Como este SQL é provado antes de tocar staging

[`scripts/db-drill/run.sh`](../../db-drill/run.sh) executa os quatro `.sql` acima contra
o Postgres efêmero do drill, depois de aplicar todas as migrations e embrulhados pelo
mesmo prólogo `READ ONLY`. Isso prova o que a leitura estática não alcança: sintaxe
válida, todo objeto de catálogo referenciado existente, e a transação read-only aceitando
cada consulta.

Um preflight que só falha ao vivo, contra staging, com o Founder olhando, é pior do que
preflight nenhum.
