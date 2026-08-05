# Automação segura do preflight de staging — R2.3

**Registrado em 2026-08-04.** `main` em `252af35`; §8B acrescentado com a `main` em `8ded9d2`.

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

A senha nunca entra na linha de comando do `psql`, e desde a R2.3B também **não entra no
ambiente**: ela é escrita num `.pgpass` de modo `0600` no diretório efêmero, e o que atravessa
o processo é o caminho. Host e usuário recebem `::add-mask::` — o GitHub mascara o secret
inteiro sozinho, mas não seus pedaços, e é o pedaço que vaza numa mensagem de erro de conexão.

A senha ficou de fora dessa lista de propósito: mascará-la exigiria trazer o valor de volta
para o shell, que é o oposto do que a mudança fez. Ver §8B.

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

> **Medida em 04/08/2026, antes do segredo existir.** Preservada como está: ela é a razão de a
> §8B existir, e reescrevê-la apagaria a diferença entre "não havia como olhar" e "olhou-se e o
> banco recusou". O estado atual do secret está em [§8B](#8b-r23b--a-primeira-execução-com-credencial-04082026).

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

## 8B. R2.3B — a primeira execução com credencial (04/08/2026)

O segredo `SUPABASE_DB_URL` foi cadastrado no Environment `staging` pelo Founder. Verificado
pela **presença do nome**, nunca pelo valor — e ausente em `production`, como o mandato exige.

O preflight foi executado **quatro vezes**. As três primeiras falharam por defeito **meu**, e
isso é o principal registro desta seção.

| #   | Run                                                                              | Onde parou                              | De quem era o defeito                 |
| --- | -------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------- |
| 1   | [30965931926](https://github.com/samuel3ssilva/vipreco/actions/runs/30965931926) | `password authentication failed`        | **meu** — o decompositor da URL       |
| 2   | [30966712920](https://github.com/samuel3ssilva/vipreco/actions/runs/30966712920) | `base64: invalid input` ×3, depois auth | **meu** — o `read` comia o padding    |
| 3   | [30967023601](https://github.com/samuel3ssilva/vipreco/actions/runs/30967023601) | `password authentication failed`        | ambíguo — restava o percent-encoding  |
| 4   | [30967421936](https://github.com/samuel3ssilva/vipreco/actions/runs/30967421936) | as **duas** leituras da senha recusadas | **da credencial** — e agora com prova |

### Por que os três primeiros erros pareciam ser do banco

Os defeitos eram quatro no parser e um no shell, e o que os une é o que importa: **nenhum
deles falha**. Todos entregam uma senha silenciosamente diferente da cadastrada — e uma senha
diferente volta do Postgres com exatamente a mesma mensagem de uma senha inválida.

| Defeito               | O que produzia                                                                         | PR                                                      |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `+` → espaço          | em URI, `+` é um mais **literal**; quem troca `+` por espaço é o formato de formulário | [#65](https://github.com/samuel3ssilva/vipreco/pull/65) |
| `%` sem hex válido    | `printf '%b'` devolvia `\x` literal — e avisava no stderr, sem ninguém ler             | #65                                                     |
| `\n`, `\t`, `\\`      | `printf '%b'` tratava a senha como **formato**, não como dado                          | #65                                                     |
| split no primeiro `@` | senha com `@` literal truncada; o corte é no **último**                                | #65                                                     |
| `read` com `IFS='='`  | descarta o `=` final da linha, que em base64 é o **padding**: `postgres` → `postgr`    | [#66](https://github.com/samuel3ssilva/vipreco/pull/66) |

O último é o mais instrutivo. Eu havia testado o parser e testado o `base64 --decode` —
**separadamente**. O defeito morava na costura. Conferir as duas margens não é conferir a
ponte, e por isso a leitura virou `load-components.sh`, uma função com nome e com teste que a
executa de verdade, em bash, sobre a saída real do parser.

Pior ainda: o **GNU base64 recusa** com `invalid input`, o do **macOS trunca em silêncio**. O
mesmo código falha barulhento no CI e mudo na máquina de quem escreve.

### O CodeQL estava certo

A primeira correção emitia `PGPASSWORD=<base64>` em stdout, e o CodeQL apontou
`js/clear-text-logging`. Base64 não é proteção — e aqui era pior que neutro: o `::add-mask::`
do GitHub mascara o valor **literal** do secret e não reconhece o base64 do mesmo valor. A
codificação que parecia esconder era exatamente o que furava o mascaramento.

A correção não foi silenciar o alerta, foi remover o que ele apontava: a senha passou a ser
escrita direto num `.pgpass` de modo `0600` dentro do diretório efêmero, e o que atravessa o
pipe é o **caminho**. Ela nunca vira variável de ambiente, nunca atravessa um pipe e nunca
passa codificada.

### A última dúvida que era nossa

O run 3 chegou limpo até a autenticação e o diagnóstico imprimiu `forma da URL:
senha:percent-encoded`. Esse rótulo é ambíguo por natureza: decodificar percent é o certo — é
o que o libpq faz com uma URI — **exceto** se a senha contiver literalmente `%40` e tiver sido
colada crua. As duas situações são indistinguíveis no texto e terminam no mesmo erro.

Então o parser passou a escrever **os dois candidatos** (o segundo só quando a decodificação
muda algo), e o runner tenta o segundo se o primeiro for recusado. Não é adivinhar senha: os
dois saem de forma determinística do mesmo valor cadastrado. É a diferença entre dizer que a
credencial está errada e **ter provado** que está.

### O resultado do run 4

```
psql: FATAL: password authentication failed for user "postgres"
      password retrieved from file ".../.pgpass"
warning: Primeira tentativa recusada. Repetindo com a senha SEM decodificacao percent...
psql: FATAL: password authentication failed for user "postgres"
      password retrieved from file ".../.pgpass-alt"
```

O que isso estabelece, e o que não estabelece:

| Estabelecido                                            | Como                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| a URL é sintaticamente válida e aponta para **staging** | a recusa de produção deixou passar, e ela exige o ref de staging no host ou no usuário |
| o host existe e responde                                | resolveu para IPv4 da AWS `ca-central-1`, porta 5432                                   |
| o TLS completou e o **servidor** respondeu              | a mensagem é `FATAL` do Postgres, não erro de rede                                     |
| o usuário chega como `postgres`                         | é o que o servidor cita de volta — coerente com conexão direta                         |
| o `.pgpass` foi lido pelo libpq                         | o próprio psql informa de qual arquivo                                                 |
| **as duas** leituras possíveis da senha foram recusadas | duas tentativas, dois arquivos distintos                                               |

**Não estabelecido:** nada sobre o conteúdo de staging. Nenhuma consulta rodou. G3, G4, G5 e
G7 continuam exatamente onde a R2.2 os deixou, e continuam `UNKNOWN` por **limite de medição**,
não por defeito do banco.

### O que muda em G15

A R2.2 registrou G15 como **FAIL** porque _não existia_ credencial. Agora existe uma, e ela é
recusada. O gate continua **FAIL**, mas a natureza do bloqueio mudou — e é a segunda vez nesta
missão que um bloqueio muda de natureza sem mudar de cor:

| Quando | Bloqueio                      | Significa                                             |
| ------ | ----------------------------- | ----------------------------------------------------- |
| R2.2   | `CREDENTIAL ACCESS REQUIRED`  | não existe caminho                                    |
| R2.3   | `STAGING SECRET REQUIRED`     | existe caminho, falta a decisão                       |
| R2.3B  | `STAGING CREDENTIAL REJECTED` | a decisão foi tomada, o valor não é aceito pelo banco |

Causas possíveis, em ordem, e nenhuma resolúvel daqui — o segredo só pode ser reescrito pelo
Founder:

1. a senha cadastrada **não é a do banco** — foi rotacionada, ou é a senha da conta Supabase e
   não a do Postgres (são coisas diferentes, e o painel não deixa isso óbvio);
2. a senha tem caractere especial e foi colada **sem percent-encoding** na URI — `@` deve virar
   `%40`, `:` `%3A`, `/` `%2F`, `?` `%3F`, `#` `%23`, `%` `%25`. Esta hipótese está **enfraquecida**
   pelo run 4, que testou as duas leituras, mas não eliminada: ela cobre o caso de decodificar
   demais ou de menos, não o de um caractere que quebrou a URI antes disso;
3. o usuário não corresponde ao host — conexão direta usa `postgres`, o pooler usa
   `postgres.<project-ref>`. O servidor citou `postgres` e o host é o direto, então os dois são
   coerentes entre si.

**A ação mínima:** reemitir a senha do banco no painel do Supabase (_Project Settings →
Database → Reset database password_), montar a URI com a senha **percent-encoded** e regravar o
Environment Secret `SUPABASE_DB_URL` de `staging`. Nunca colar o valor em chat, em `.env`
versionado, em `VITE_*` ou em issue. Depois disso, basta redisparar o workflow.

---

## 8C. R2.3C — a senha foi redefinida, e continuou recusada (05/08/2026)

O Founder redefiniu a senha do banco de staging, informou que ela contém **somente letras e
números** e regravou o Environment Secret. O preflight foi executado mais **três** vezes.

| Run                                                                              | Resultado                           |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| [30968428118](https://github.com/samuel3ssilva/vipreco/actions/runs/30968428118) | as duas leituras da senha recusadas |
| [30968511563](https://github.com/samuel3ssilva/vipreco/actions/runs/30968511563) | idem                                |
| [30968940937](https://github.com/samuel3ssilva/vipreco/actions/runs/30968940937) | idem, ~13 min depois                |

**Nenhuma alteração foi feita no parser.** O mandato pediu confirmação antes de mexer nele, e a
confirmação foi obtida por leitura, não por suposição: a versão em `main` já cobre URL crua e
percent-encoded, escreve a senha em `.pgpass` `0600`, não imprime segredo e tem os testes de
costura verdes (`bun run test`, 872). Trocar um parser provado por outro seria repetir o erro
de R2.3B na direção oposta.

### Propagação foi descartada por medição, não por espera

| Fato                            | Valor       |
| ------------------------------- | ----------- |
| `SUPABASE_DB_URL` atualizado em | `02:05:47Z` |
| Run 1 iniciado em               | `02:07:20Z` |
| Diferença                       | **93 s**    |

O secret **foi** regravado, e o run leu o valor novo. A terceira execução, treze minutos
depois, descarta também qualquer atraso do lado do Supabase. Verificado pelo campo `updated_at`
da API — **a presença e a data do segredo, nunca o valor**.

### O diagnóstico que aponta para onde procurar

As três execuções imprimiram:

```
forma da URL: senha:percent-encoded
```

Esse rótulo só aparece quando `decodeURIComponent(senha) !== senha` — ou seja, quando a senha
**como está gravada no secret** contém uma sequência `%XX`, ou um caractere que o parser de URL
precisa escapar. Uma senha puramente alfanumérica não produz esse rótulo.

**Isso contradiz a descrição.** A leitura mais provável é que o valor gravado não seja o valor
pretendido: a URI antiga pode ter sido regravada, ou a senha nova colada dentro de uma URI que
ainda carregava a antiga.

O diagnóstico não prova qual das duas — prova apenas que **o conteúdo do secret não é
alfanumérico puro**, e isso já basta para saber onde olhar. É o oposto do que acontecia antes
da R2.3B, quando a mesma mensagem podia vir de cinco defeitos meus.

### Veredito

**`STAGING DATABASE PASSWORD STILL REJECTED`**

Nenhuma consulta foi executada. G3, G4, G5 e G7 continuam `UNKNOWN` por **limite de medição**.
Nenhuma escrita, nenhum deploy, produção não contatada.

**Ação mínima:** conferir o valor do secret. Ele precisa ser a URI completa
`postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres`, com a senha nova no lugar —
e, se ela tiver qualquer caractere especial, percent-encoded (`%` → `%25`).

---

## 9. Onde o gate ficou

| Item                                 | Estado                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Migrations aplicadas                 | **nenhuma**                                                                    |
| Escritas emitidas                    | **nenhuma**                                                                    |
| Banco de produção                    | **não contatado**                                                              |
| Backfill                             | **não iniciado**                                                               |
| Deploys                              | **nenhum** — staging em `862a179`, produção em `b88e514`                       |
| `db-schema-drill-required` na `main` | **obrigatório**                                                                |
| Preflight remoto                     | **executado 7×** — mecânica provada, banco não auditado                        |
| Auditoria de staging                 | **não realizada** — `STAGING DATABASE PASSWORD STILL REJECTED` (§8C)           |
| Recuperação de staging               | metade versionada **provada** ([`staging/recovery.md`](./staging/recovery.md)) |

A ação mínima do Founder mudou de novo: a senha já foi reemitida, e o secret continua com um
valor que **não é alfanumérico puro**. Falta conferir o conteúdo do segredo. O detalhe está em
§8C.

Nada disso reabre decisão resolvida. Os achados de R2.2 continuam de pé, inclusive os dois
GTINs inválidos em staging — que não são curadoria pendente, e cuja correção continua sendo
escrita, logo continua sendo decisão do Founder/PMO.
