# Automação segura do preflight de staging — R2.3

**Registrado em 2026-08-04.** `main` em `252af35`.

Duas frentes, uma consequência: o gate de R2 continua fechado, e agora pelo motivo certo — a
resposta que falta é do banco, não da ferramenta.

---

## 1. O que foi construído

| Frente                                                     | PR                                                      | Estado                       |
| ---------------------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| `db-schema-drill` exigível sem travar PR documental        | [#62](https://github.com/samuel3ssilva/vipreco/pull/62) | mergeado, check obrigatório  |
| Workflow manual e read-only de preflight remoto de staging | [#63](https://github.com/samuel3ssilva/vipreco/pull/63) | mergeado, registrado e ativo |

A primeira está detalhada em [`branch-protection.md`](./branch-protection.md). Esta página
trata da segunda.

---

## 2. Por que o preflight virou workflow

A R2.2 mediu staging com a chave **anônima** — a mesma que o site público usa — e bateu no
teto dela. Índices, constraints, funções, policies, grants, linhas inativas e o histórico de
migrations são todos invisíveis para `anon`, e isso é o comportamento **correto**, não um
defeito.

O resultado foi um gate com três `UNKNOWN` que não eram sobre o banco: eram sobre a medição.
G3 reprovou como estado **E. UNKNOWN** porque o histórico é ilegível, não porque estivesse
errado. G4 e G5 ficaram indeterminados pelo mesmo motivo.

Fechar essa lacuna exige uma credencial que enxergue o catálogo. E é exatamente por isso que
a garantia de read-only precisou deixar de ser uma promessa no cabeçalho.

---

## 3. A garantia de read-only, em três camadas

A suposição perigosa seria "a credencial é read-only". **Ela não é**: o único papel do Supabase
que enxerga `supabase_migrations.schema_migrations` também escreve em tudo. A garantia vem da
sessão, não do usuário — e de três lugares independentes:

| Camada              | Onde                              | O que impede                                          |
| ------------------- | --------------------------------- | ----------------------------------------------------- |
| **A. Estática**     | `read-only-guard.ts`              | verbo de escrita nos `.sql`, antes de abrir conexão   |
| **B. Transacional** | `_prologue.sql`                   | `BEGIN; SET TRANSACTION READ ONLY;` — o banco recusa  |
| **C. Verificação**  | 1ª consulta de `00-structure.sql` | confirma no banco que B pegou; o runner aborta se não |

A camada A roda **duas vezes**: em `bun run test` e dentro do próprio workflow, segundos antes
do `psql`. As duas importam por motivos diferentes — um teste que só roda no CI protege o
repositório, não o banco.

Os `SET` vêm **dentro** da transação e como `SET LOCAL`, porque a connection string de staging
pode ser a do pooler em modo _transaction_, onde parâmetro de sessão fora de transação não
sobrevive de um statement para o outro.

---

## 4. Produção é inalcançável, e isso é verificado

O runner lê os dois project refs de `config/environments.json` — já versionado, já público — e
aborta em três situações:

1. a connection string aponta para o ref de **produção**;
2. não dá para confirmar que ela é a de **staging**;
3. não dá para **ler** os refs.

O terceiro item não é zelo. Sem ele a guarda falharia **aberta**: com `REF_STAGING` vazio,
`!= *""*` é sempre falso e a confirmação de staging passaria calada. É o pior tipo de defeito,
porque a checagem parece estar lá.

Ler o ref de produção aqui serve para uma coisa só: **recusar**. É a diferença entre "o
workflow não aponta para produção" e "o workflow se recusa a rodar contra produção mesmo se
alguém apontar" — e só a segunda é uma garantia.

---

## 5. O que o workflow não carrega

**Não instala a CLI do Supabase.** O histórico de migrations sai de `SELECT` direto em
`supabase_migrations.schema_migrations`, que responde a mesma pergunta que
`supabase migration list`. A diferença importa: assim o runner **nunca carrega uma ferramenta
que também saiba aplicar migration**.

**Não existe modo `apply`.** Escrever em staging é missão própria, com gate humano próprio.

---

## 6. O que nunca é publicado

Connection string, senha, token, host completo, GTIN completo, linha de tabela, dado pessoal.
O que se publica é um hash truncado do host mais os últimos caracteres do project ref:
suficiente para conferir **qual** ambiente foi lido, insuficiente para alcançá-lo.

Três consequências práticas:

- **a saída de `target-readiness.sql` é retida.** A consulta 2 dele devolve GTIN completo. O
  script roda, e o que se registra é o _status_; a auditoria equivalente, mascarada, sai de
  `20-content.sql`;
- **o dump de produtos do preview é apagado**, e só a contagem por estado entra no resumo.
  Nenhum artefato é enviado;
- **a máscara acontece no SQL, não na renderização.** Mascarar só no fim deixaria o código
  completo no arquivo intermediário — exatamente onde ninguém procuraria depois.

A senha nunca entra na linha de comando do `psql`: a URL é decomposta em variáveis libpq, e
cada pedaço recebe `::add-mask::`. O GitHub mascara o secret inteiro sozinho, mas não seus
pedaços — e é o pedaço que vaza numa mensagem de erro de conexão.

---

## 7. Como o SQL foi provado sem tocar em staging

`scripts/db-drill/run.sh` executa os quatro `.sql` do preflight contra o Postgres efêmero do
drill, depois de aplicar todas as migrations e embrulhados pelo mesmo prólogo `READ ONLY`.

Confirmado no CI do PR #63:

```
==> Preflight remoto de R2: executando os .sql contra o banco vivo do drill...
  -> 00-structure.sql
  -> 10-migration-history.sql
  -> 20-content.sql
  -> 30-quantity-input.sql
```

Isso prova o que a leitura estática não alcança: sintaxe válida, todo objeto de catálogo
referenciado existente, e a transação read-only aceitando cada consulta. Um preflight que só
falha ao vivo, contra staging, com o Founder olhando, é pior do que preflight nenhum.

Duas decisões de SQL vieram daí:

- a presença da tabela de histórico é lida do catálogo, e não por `to_regclass`, cujo
  comportamento com schema inexistente já variou entre versões do Postgres;
- os grants de tabela saem de `pg_class.relacl`, e não de
  `information_schema.role_table_grants` — essa view só mostra grant em que o usuário corrente
  é grantor, grantee ou membro. Uma lista silenciosamente incompleta pareceria "nenhum grant
  perigoso": a leitura errada, e a que passa despercebida.

---

## 8. A execução: `STAGING SECRET REQUIRED`

O segredo `SUPABASE_DB_URL` **não existe** no GitHub Environment `staging`. Verificado pela
presença do nome, nunca pelo valor:

| Environment  | Secrets registrados (nomes)                                                                                       | `SUPABASE_DB_URL`                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `staging`    | `CLOUDFLARE_API_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `VITE_WHATSAPP_NUMBER` | **ausente**                                  |
| `production` | `CLOUDFLARE_API_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`                         | ausente, e assim deve continuar nesta missão |

Nenhum `SUPABASE_SERVICE_ROLE_KEY` em lugar nenhum — coerente com o que a R2.2 já havia
registrado, e com `scripts/deploy-config-consistency.test.ts`, que falha se um workflow de
deploy passar a mencioná-lo.

### O que foi disparado, e o que não foi

O workflow foi executado uma vez ([run 30929441045](https://github.com/samuel3ssilva/vipreco/actions/runs/30929441045)),
**deliberadamente sem o segredo**, para validar toda a mecânica antes do primeiro uso real:

| Passo                          | Resultado                                            |
| ------------------------------ | ---------------------------------------------------- |
| Checkout, Setup Bun, `install` | ✅                                                   |
| Garantir cliente `psql`        | ✅ — `psql (PostgreSQL) 16.14`                       |
| Guarda estática de read-only   | ✅ — `guarda de read-only aprovou os 6 arquivos SQL` |
| Preflight read-only de staging | ❌ — `STAGING DATABASE SECRET REQUIRED`              |

O ❌ é o comportamento **projetado**, não um defeito: a presença do segredo é verificada antes
de tudo, e sem ele nenhuma conexão é aberta. **Nenhuma auditoria foi executada**, nenhum banco
foi contatado, nada foi lido de staging.

A distinção importa para ler o histórico de execuções: este run vermelho valida o workflow,
não mede o banco.

### Um registro de deployment que **não** é um deploy

Esse run criou, no GitHub, um _deployment record_ para o ambiente `staging` em `252af35`. É
consequência automática de o job declarar `environment: staging` — o GitHub abre um registro
para qualquer job que use um Environment, tenha ele deployado alguma coisa ou não.

**Nenhum deploy aconteceu.** `deploy-staging.yml` é `workflow_dispatch` puro, e sua última
execução continua sendo a de 02/08/2026, em `862a179`. O Worker de staging serve exatamente
o mesmo build de antes, e o de produção também. Os dois respondem `HTTP 200`.

| O que                                 | Estado                                                        |
| ------------------------------------- | ------------------------------------------------------------- |
| Último `deploy-staging.yml` executado | 02/08/2026, `862a179` — inalterado                            |
| Worker de staging                     | mesmo build; `HTTP 200`                                       |
| Worker de produção                    | `b88e514`; `HTTP 200`                                         |
| Registro de deployment em `252af35`   | criado pelo `environment:` do preflight, com status `failure` |

Fica escrito porque lido de relance — "staging :: 252af35" no topo da lista de deployments —
isso parece um deploy novo, e não é. A diferença entre "o GitHub registrou um uso de
Environment" e "o Worker foi republicado" é a diferença entre nada ter mudado e o piloto ter
mudado de versão sem ninguém pedir.

---

## 9. Onde o gate ficou

| Item                                 | Estado                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| Migrations aplicadas                 | **nenhuma**                                              |
| Escritas emitidas                    | **nenhuma**                                              |
| Banco de produção                    | **não contatado**                                        |
| Backfill                             | **não iniciado**                                         |
| Deploys                              | **nenhum** — staging em `862a179`, produção em `b88e514` |
| `db-schema-drill-required` na `main` | **obrigatório**                                          |
| Preflight remoto                     | **pronto e não executado** — falta o segredo             |

A ação mínima do Founder: cadastrar `SUPABASE_DB_URL` como **Environment Secret** de `staging`,
apontando para o Postgres de **staging**. Nunca colar o valor em chat, em `.env` versionado,
em `VITE_*` ou em issue.

Nada disso reabre decisão resolvida. Os achados de R2.2 continuam de pé, inclusive os dois
GTINs inválidos em staging — que não são curadoria pendente, e cuja correção continua sendo
escrita, logo continua sendo decisão do Founder/PMO.
