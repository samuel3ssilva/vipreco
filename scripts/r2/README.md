# `scripts/r2/` — ferramentas de rollout de R2

Todas **read-only**. Nenhuma escreve, aplica migration, faz backfill ou abre conexão
sozinha com ambiente algum.

| Arquivo                                                              | O que é                                                                                                                                  | Onde roda                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [`target-readiness-pre.sql`](./target-readiness-pre.sql)             | prontidão do schema **legado**: quantos produtos, quais GTINs são inválidos, quais objetos existem e quais ainda não                     | **antes** da aplicação — gate G7-PRE |
| [`target-readiness-post.sql`](./target-readiness-post.sql)           | verificação **pós-R2-A**: colunas nasceram vazias, colisões e constraints                                                                | **depois de R2-A** — G7-POST         |
| [`target-readiness-post-gtin.sql`](./target-readiness-post-gtin.sql) | as duas implementações do dígito verificador concordam sobre os GTINs que existem                                                        | **depois de R2-B** — G7-POST-GTIN    |
| [`target-readiness.test.ts`](./target-readiness.test.ts)             | prova que os dois são read-only, que a parte PRE não depende de nada que a migration cria, e que a aritmética GS1 duplicada não divergiu | `bun run test`                       |
| [`equivalence/`](./equivalence/)                                     | fingerprint semântico do schema e comparação staging × as 8 migrations anteriores a R2                                                   | `workflow_dispatch`                  |

## Os dois `target-readiness`, e por que são dois

Até R2.4 havia um arquivo só, e o gate G7 dizia "executado por inteiro". As consultas 5 a 7
referenciam objetos que a migration **cria** — antes de aplicar, o script parava em `42703`,
o gate marcava `FAIL`, e o `FAIL` bloqueava a aplicação. G7 exigia, para autorizar a
migration, uma prova que só a migration podia produzir. O `FAIL` não media o ambiente; media
o gate.

Separar desfaz a circularidade na estrutura, e não num comentário pedindo tolerância. O
teste que impede a volta compara **identificadores**, e não texto: `column_name =
'package_type'` é uma pergunta ao catálogo e responde `false` num banco onde a coluna não
existe; `WHERE package_type IS NOT NULL` é uma referência e aborta. As duas contêm a mesma
sequência de caracteres, e só uma impede o script de rodar antes da migration.

A terceira ferramenta do rollout vive fora desta pasta porque não é SQL:
[`../backfill-preview.ts`](../backfill-preview.ts) lê `size_text` e devolve **propostas**
classificadas, sem nunca escrever.

E a quarta vive em [`preflight/`](./preflight/): a auditoria **remota** de staging, que
roda por `workflow_dispatch` e responde o que a chave anônima não alcança — índices,
constraints, funções, policies, grants, linhas inativas e o histórico de migrations. Também
read-only, e com a garantia em três camadas em vez de uma.

Procedimento: [`../../docs/data/R2-ROLLOUT-RUNBOOK.md`](../../docs/data/R2-ROLLOUT-RUNBOOK.md).
Autorização: [`../../docs/data/R2-APPLICATION-GATE.md`](../../docs/data/R2-APPLICATION-GATE.md).

---

## Por que a garantia de read-only é teste, e não comentário

`target-readiness-pre.sql` roda contra **produção**, com credencial de `service_role`, sob
janela de manutenção. É o momento de menor margem para erro do rollout inteiro.

Um cabeçalho dizendo "este arquivo não escreve" vale exatamente até alguém acrescentar uma
consulta útil que, de passagem, cria uma tabela temporária. `target-readiness.test.ts` lê o
arquivo, ignora os comentários, e falha se qualquer verbo de escrita aparecer — mais um
controle positivo que confirma que a própria verificação reprova quando deveria. Um teste
que só passa não distingue "o script está limpo" de "a checagem não funciona".

Além disso, `scripts/db-drill/run.sh` **executa** os dois `.sql` contra o Postgres efêmero do
drill, depois de aplicar todas as migrations. Isso prova o que a leitura estática não
alcança: que a sintaxe é válida e que toda coluna, função e índice referenciados existem de
fato. Um runbook que manda rodar uma consulta quebrada é pior do que um runbook sem
consulta nenhuma.

---

## A aritmética duplicada, e por que ela é vigiada

A consulta 2 de `target-readiness-pre.sql` reimplementa o dígito verificador GS1 em linha, em
vez de chamar `public.pa_is_valid_gtin()`. Não é descuido: essa consulta precisa rodar
**antes** de a migration `20260803020000` criar a função — é ela que decide se a migration
pode ser aplicada.

Algoritmo duplicado é algoritmo que diverge. E a divergência perigosa não é a que reprova
demais no `VALIDATE` — essa falha fechada, e o pior que acontece é um susto. É a que
**reprova um GTIN válido na auditoria** e manda alguém "corrigir" dado bom. Um GTIN válido
pertence a algum produto real; o ViPreço não inventa código, e também não deveria mandar
apagar um.

Por isso a mesma expressão roda no drill contra Postgres vivo, comparada vetor a vetor com
a função, e `target-readiness.test.ts` confere que as duas cópias não divergiram no texto.
