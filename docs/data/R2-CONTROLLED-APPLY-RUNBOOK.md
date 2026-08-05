# Runbook — aplicação controlada de R2 em staging

**Status:** NORMATIVO — o único procedimento autorizado para escrever no banco de staging.
**Workflow:** [`.github/workflows/r2-staging-apply.yml`](../../.github/workflows/r2-staging-apply.yml)
**Runner:** [`scripts/r2/apply/run.sh`](../../scripts/r2/apply/run.sh)

> **Produção não aparece neste documento porque não aparece no workflow.** Não existe input
> de ambiente, de host ou de connection string; o alvo é derivado de arquivo versionado, e
> quatro guardas independentes recusam qualquer coisa que não seja staging. Aplicar em
> produção é missão própria, com gate próprio, e nada aqui a autoriza.

---

## 1. Por que uma operação por disparo

Cada operação é irreversível contra um ambiente real. Uma operação `apply-all` transformaria
nove checkpoints em um — e a chance de perceber um problema mora exatamente no intervalo
entre uma aplicação e a seguinte. A ausência dessa operação é o desenho, não uma lacuna a
preencher depois.

O workflow também não sabe continuar sozinho: cada disparo executa **uma** operação, mede o
estado antes, mede o estado depois, e para. Quem decide o próximo passo é uma pessoa lendo o
resumo do passo anterior.

## 2. A matriz de estados

A ordem não é preferência. `remediate-demo-gtins` vem antes de R2-A porque R2-B cria a
constraint de GTIN válido, e um GTIN inválido presente faria a constraint falhar **no meio de
uma migration** — o pior lugar do mundo para descobrir um problema de dado. E os dois
hardenings vêm depois da normalização porque `products_exact_identity_idx` (R2-A) é um índice
funcional sobre `pa_normalize_text()`: aplicá-lo antes assaria a normalização errada dentro do
índice de identidade.

| #   | Operação                       | Histórico antes | Histórico depois | Frase de confirmação                              |
| --- | ------------------------------ | :-------------: | :--------------: | ------------------------------------------------- |
| —   | `plan`                         |    qualquer     |    inalterado    | _(vazio)_                                         |
| 1   | `adopt-seven-baseline`         |        0        |        7         | `ADOPT SEVEN MIGRATIONS IN VIPRECO STAGING`       |
| 2   | `apply-normalization`          |        7        |        8         | `APPLY NORMALIZATION TO VIPRECO STAGING`          |
| 3   | `apply-core-hardening`         |        8        |        9         | `APPLY CORE HARDENING TO VIPRECO STAGING`         |
| 4   | `apply-contribution-hardening` |        9        |        10        | `APPLY CONTRIBUTION HARDENING TO VIPRECO STAGING` |
| 5   | `remediate-demo-gtins`         |       10        |        10        | `NULL TWO DEMO GTINS IN VIPRECO STAGING`          |
| 6   | `apply-r2a`                    |       10        |        11        | `APPLY R2A TO VIPRECO STAGING`                    |
| 7   | `apply-r2b`                    |       11        |        12        | `APPLY R2B TO VIPRECO STAGING`                    |
| —   | `validate`                     |    qualquer     |    inalterado    | _(vazio)_                                         |

As frases são **exatas**: caixa, espaços e pontuação contam, e nada é aparado. Aparar em
silêncio é a família de defeito que R2.3D eliminou da credencial — se a pessoa colou algo
diferente do que a operação exige, a resposta certa é dizer isso, não adivinhar.

Cada frase nomeia a operação **e** o ambiente. Uma frase universal seria pior que frase
nenhuma: treinaria quem opera a colar sempre a mesma coisa, e o propósito da frase é obrigar
a ler qual operação está sendo disparada.

A mensagem de erro **não** imprime a frase esperada. Imprimi-la transformaria a confirmação
num formulário que se preenche copiando o erro.

## 3. Como disparar

1. Confirme o SHA atual da `main`:

```bash
git fetch origin && git rev-parse --short origin/main
```

2. Actions → **R2 staging apply** → _Run workflow_, com `Use workflow from: main`.
3. Preencha `operation`, `expected_main_sha` (o SHA do passo 1) e `confirmation_phrase`.
4. Leia o **Job Summary** inteiro antes de disparar o passo seguinte.

`expected_main_sha` não é burocracia: o workflow roda a partir de um ref, e o ref pode ter
avançado entre a decisão de disparar e o disparo. Um SHA divergente significa que o operador
leu um plano e disparou outro.

## 4. Quando o job aborta

Toda recusa acontece **antes** de qualquer escrita, e o resumo termina com _"Nenhuma escrita
foi emitida"_.

| Veredito                                          | O que aconteceu                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ENVIRONMENT REFUSED`                             | o job não está no Environment `staging`                                                        |
| `REF REFUSED`                                     | o disparo não veio de `main`                                                                   |
| `MAIN SHA MISMATCH`                               | a `main` avançou entre a decisão e o disparo                                                   |
| `OPERATION INPUT REFUSED`                         | operação inexistente, ou frase que não é a dela                                                |
| `STAGING DATABASE PASSWORD SECRET REQUIRED`       | o segredo não está no Environment                                                              |
| `PROJECT REF MISMATCH` / `PRODUCTION REF REFUSED` | `supabase/config.toml` e `config/environments.json` discordam, ou apontam para produção        |
| `CREDENTIAL REFUSED`                              | a cadeia de recusa de R2.3D barrou (refs ausentes, iguais, ou ref de produção no usuário/host) |
| `STAGING UNREACHABLE`                             | o catálogo não pôde ser lido                                                                   |
| `READ ONLY GUARD FAILED`                          | a transação de medição não estava read-only                                                    |
| `PRECONDITION REFUSED`                            | a operação anterior não terminou, ou esta já rodou                                             |
| `COLLISION DETECTOR BROKEN`                       | o detector de colisões aceitou um par sinteticamente colidente                                 |
| `G7 POST FAILED`                                  | R2-A aplicou, mas a prontidão pós-aplicação reprovou                                           |
| `POST STATE UNEXPECTED`                           | a operação rodou e o estado posterior não é o previsto                                         |

Os três últimos são diferentes dos outros: neles **algo já foi escrito**. `POST STATE
UNEXPECTED` e `G7 POST FAILED` param a sequência, e o próximo passo é humano — não dispare a
operação seguinte antes de entender o que o resumo apontou.

## 5. O que garante que produção não é alcançada

Quatro pontos independentes, e a independência é o ponto: uma guarda que depende de outra
falha junto com ela.

1. `SUPABASE_DB_PASSWORD` só existe no Environment `staging`. O Environment `production` não
   carrega segredo de banco nenhum — nem para leitura.
2. `APPLY_ENVIRONMENT` precisa ser exatamente `staging`.
3. `preparar_credencial` (reaproveitada de R2.3D, não reescrita) aborta se o usuário ou o
   host mencionarem o ref de produção, e aborta também se os dois refs forem iguais ou
   faltarem — sem os dois, a recusa não seria verificável, e guarda não verificável não é
   guarda.
4. `supabase/config.toml` precisa declarar o `project_id` de staging. É a âncora que a CLI
   lê; sem ela, a CLI e as guardas poderiam falar de projetos diferentes em silêncio.

## 6. O que garante que o segredo não vaza

- Leitura única, num bloco `env:`. Nunca em `run:`, nunca em `echo`, nunca em Job Summary,
  nunca em artefato.
- O runner escreve a senha direto num `.pgpass` de modo `0600` e **remove a variável do
  ambiente** em seguida. Dali em diante, `psql`, a CLI e o `bun` herdam um ambiente que não
  a contém.
- `set -x` é explicitamente desligado (`set +x`). Com ele, cada expansão iria para o log.
- **A URL entregue à CLI não carrega senha.** `--db-url` vai para `argv`, e `argv` é visível
  para qualquer processo da máquina. A senha fica no `.pgpass`, que o driver da CLI (pgx) lê
  como o libpq leria. Se um dia a CLI parar de honrar `PGPASSFILE`, a conexão falha por
  autenticação — e um bloqueio reportado é melhor que uma senha em `argv` como plano B.
- O `trap` apaga o diretório de trabalho **inclusive quando o script falha no meio**, que é
  justamente quando alguém esqueceria.
- Host publicado só como hash truncado; GTIN nunca completo; nenhuma linha de tabela.

## 7. O mecanismo oficial de migrations

Nenhuma linha é inserida à mão na tabela de histórico. Escrever ali por SQL produziria um
histórico que a própria CLI não reconheceria como seu, e a operação seguinte mediria um estado
que não existe.

- **Adoção:** `supabase migration repair --status applied <7 versões>`. É o mecanismo oficial
  para registrar versão já aplicada — e é o caso de staging, cujo schema foi aplicado pelo
  editor SQL do painel e por isso nunca entrou no histórico.
- **Aplicação:** `supabase db push --workdir <efêmero>`.

`db push` aplica **todas** as pendentes. Sem limitar, `apply-normalization` aplicaria as cinco
de uma vez e os checkpoints deixariam de existir. O limite usa o `--workdir` oficial da CLI:
o runner monta um diretório temporário com as migrations **até** a versão alvo, copiadas dos
arquivos versionados e **conferidas por hash**. Nada é editado, renomeado ou reescrito; um
arquivo cujo hash não bate aborta a operação, porque copiar errado é indistinguível de aplicar
outra coisa. O diretório vai embora com o `trap`.

## 8. O que o `plan` verifica

Estritamente read-only. Roda os mesmos `.sql` do preflight — medição única, porque duas
medições do mesmo fato divergem, e quando divergirem, a que decide se pode escrever não pode
ser a que ninguém olhou.

Além disso:

- **Relatório de colisões de normalização.** O `REINDEX` de `20260803000000` falha se duas
  linhas forem distintas só pelo espaçamento. Falhar é o comportamento certo — o banco recusa
  a mudança em vez de aceitar uma união silenciosa. O relatório existe para descobrir isso
  antes, com calma.
- **Controle positivo do detector.** Um par sinteticamente colidente é submetido ao mesmo
  detector, e o job aborta se ele **passar**. Sem isso, "0 colisões" seria indistinguível de
  "o detector não funciona" — as duas leituras passariam verdes exatamente iguais. É a mesma
  lição do controle de ACL do drill.
- **`db push --dry-run`** da CLI oficial, para conferir o que ela considera pendente.

Resultado esperado antes da primeira escrita: histórico remoto ausente, zero colisões, dois
GTINs demo inválidos, zero duplicata, e `adopt-seven-baseline` como próxima operação.

## 9. Rollback

**Não existe operação de rollback no workflow, e isso é deliberado.** Reverter contra um
ambiente real é decisão humana, e uma operação que reverte com um clique é uma operação que
alguém vai clicar por engano.

O rollback de cada migration está documentado **no próprio arquivo**, entre marcadores
`ROLLBACK-SQL-BEGIN` / `ROLLBACK-SQL-END`, e é **executado a cada CI** pelo
`scripts/db-drill/95-rollback-reapply.sh` contra um Postgres vivo — extraído do arquivo, nunca
copiado. Um bloco de rollback que nunca rodou é uma alegação.

| Operação                       | Como reverter                                                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adopt-seven-baseline`         | `supabase migration repair --status reverted <versões>`                                                                                                                                                                                                                             |
| `apply-normalization`          | bloco de rollback de `20260803000000`                                                                                                                                                                                                                                               |
| `apply-core-hardening`         | bloco de rollback de `20260803005000`                                                                                                                                                                                                                                               |
| `apply-contribution-hardening` | bloco de rollback de `20260803007500`                                                                                                                                                                                                                                               |
| `remediate-demo-gtins`         | **não reversível pelo repositório.** Os dois GTINs eram fictícios e inválidos; restaurá-los exigiria os valores originais, que ninguém deveria querer de volta. Se a intenção for reconstruir staging do zero, o caminho é o `seed.sql`, cuja idempotência o drill prova a cada CI. |
| `apply-r2a` / `apply-r2b`      | blocos de rollback dos respectivos arquivos                                                                                                                                                                                                                                         |

## 10. O que este workflow nunca faz

Backfill. Preenchimento de `quantity_value`, `quantity_unit`, `package_type` ou
`units_per_package`. Transição `parsed → confirmed`. Alteração de `size_text`. Criação ou
remoção de policy. Alteração de RLS. Ampliação de grant. Deploy. Inserção de dado real.
Qualquer contato com o banco de produção.

A única escrita de **dado** em todo o repositório é
[`scripts/r2/apply/sql/remediate-demo-gtins.sql`](../../scripts/r2/apply/sql/remediate-demo-gtins.sql):
uma coluna, dois registros fictícios, para `NULL`, dentro de uma transação que mede as
pré-condições **dentro** dela mesma, exige `ROW_COUNT = 2`, e reavalia a validade de forma
independente antes do `COMMIT` — porque `ROW_COUNT = 2` prova que duas linhas mudaram, e não
que eram as duas certas.

Isso **não é backfill**: backfill preenche campo a partir de inferência; isto esvazia um campo
cujo conteúdo é comprovadamente inválido. Nenhum valor é calculado, adivinhado ou derivado.
