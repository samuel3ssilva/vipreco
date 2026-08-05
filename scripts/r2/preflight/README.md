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
| [`prepare-credential.sh`](./prepare-credential.sh)                      | deriva host/porta/usuário/banco e escreve o `.pgpass` 0600                 |
| [`run.sh`](./run.sh)                                                    | conecta, executa e guarda fatos                                            |
| [`preflight.test.ts`](./preflight.test.ts)                              | 84 testes sobre read-only, sigilo, classificação e desenho do workflow     |
| [`prepare-credential.test.ts`](./prepare-credential.test.ts)            | 42 testes que **executam** a cadeia de credencial em bash                  |

`run.sh` é fino de propósito. Toda **decisão** mora em `render-summary.ts`, que tem
teste — decisão em shell é decisão sem teste.

---

## O que nunca sai daqui

Connection string, senha, token, host completo, GTIN completo, linha de tabela, dado
pessoal. O que se publica é um hash truncado do host mais os últimos caracteres do
project ref: dá para conferir **qual** ambiente foi lido, não dá para alcançá-lo.

Duas consequências práticas que talvez surpreendam:

- a saída de [`../target-readiness.sql`](../target-readiness.sql) **não é publicada**. A
  consulta 2 dele devolve GTIN completo. O script roda (é o §5.7 do mandato), mas o que
  se registra é o status; a auditoria equivalente, mascarada, sai de `20-content.sql`;
- o dump de produtos do preview é apagado, e só a **contagem por estado** entra no
  resumo. Nem o relatório linha a linha, nem o arquivo intermediário, nem artefato algum.

Mascarar acontece **no SQL**, não na renderização. Mascarar só no fim deixaria o código
completo no arquivo intermediário — que é exatamente onde ninguém procuraria depois.

---

## Produção é inalcançável, e isso é verificado

O runner lê os dois project refs de [`config/environments.json`](../../../config/environments.json)
— arquivo já versionado, já público — e **monta o host a partir do ref de staging**. Não
existe host vindo de fora para conferir: o host é derivado, e derivado de uma fonte só.

A cadeia de guarda de [`prepare-credential.sh`](prepare-credential.sh) **aborta** quando:

- qualquer um dos dois refs estiver ausente — uma comparação contra `""` casa sempre, e a
  recusa passaria calada;
- os dois refs forem **iguais** — nesse estado nenhuma guarda distingue os ambientes;
- o host montado contiver o ref de **produção**;
- o host montado **não** contiver o ref de staging.

As duas últimas são hoje asserções sobre a construção, e não validação de um valor
externo — eram validação quando o host vinha de uma URI cadastrada à mão. Ficam porque
voltam a ser necessárias no instante em que alguém reintroduzir um host vindo de fora, sem
depender de ninguém lembrar de recriá-las.

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

| Parâmetro | Valor                          | De onde vem                                      |
| --------- | ------------------------------ | ------------------------------------------------ |
| host      | `db.<staging-ref>.supabase.co` | `config/environments.json`, versionado e público |
| porta     | `5432`                         | constante — conexão direta                       |
| usuário   | `postgres`                     | constante — o pooler usaria `postgres.<ref>`     |
| banco     | `postgres`                     | constante                                        |

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
