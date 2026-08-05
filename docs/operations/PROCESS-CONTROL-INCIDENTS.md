# Registro de incidentes de controle de processo

**Status:** NORMATIVO — registro permanente, append-only.
**Escopo:** falhas do **controle de processo** de engenharia (branch, PR, CI, gate humano).
Incidentes de disponibilidade, exposição de segredo ou escrita não autorizada em dado real
são outra coisa e seguem [`INCIDENT-RESPONSE-PLAN.md`](INCIDENT-RESPONSE-PLAN.md).

A separação é deliberada. Um controle de processo que falha sem causar dano ainda é uma
falha — e chamá-la de "incidente de segurança" quando não houve exposição nem escrita
remota inflaciona a linguagem até ela deixar de significar coisa alguma no dia em que um
incidente de verdade acontecer. Ao mesmo tempo, não registrar equivale a decidir que o
controle não importava.

**Classificação usada aqui:** `PROCESS CONTROL INCIDENT`.

---

## PCI-001 — Push direto para `main` (commit `eccedaf`)

| Campo             | Valor                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| **Data**          | 2026-08-05                                                                       |
| **Commit**        | `eccedaf5ff20e2a6ec36076d687fe3970f586bd5`                                        |
| **Pai**           | `71e231b` (merge do PR #79)                                                       |
| **Título**        | `fix(r2): a comparação passa a perguntar pelas SETE migrations, não pelas oito`   |
| **Autor da ação** | CTO (este agente), durante a missão R2.5                                          |
| **Classificação** | `PROCESS CONTROL INCIDENT`                                                        |
| **Estado**        | Fechado com ação preventiva aplicada (ver "Ação preventiva")                      |

### O que ocorreu

Durante R2.5, ao corrigir a pergunta que a comparação de equivalência de schema fazia,
o CTO enviou o commit `eccedaf` **diretamente para `main`**, sem branch e sem pull
request. Três arquivos foram alterados: `scripts/r2/equivalence/compare.ts`,
`scripts/r2/equivalence/compare.test.ts` e `scripts/r2/equivalence/run.sh`.

O `CLAUDE.md` do repositório é explícito: *"todo trabalho passa por branch, PR e CI
(`.github/workflows/ci.yml`) antes de chegar em `main`"*. A regra foi violada.

### Por que a violação foi possível

A proteção da branch `main` já exigia os três checks obrigatórios (`lint, test, build`,
`Analyze (javascript-typescript)`, `db-schema-drill-required`), com `strict=true`,
force-push bloqueado e deleção bloqueada — mas com **`enforce_admins = false`**.

Esse campo é a diferença entre uma regra e uma sugestão. Com ele desligado, a proteção
descreve o que deve acontecer para todo mundo *exceto* quem tem permissão administrativa;
e como a conta que opera este repositório é administradora, a regra não valia para a única
pessoa capaz de quebrá-la. O `git push` não foi rejeitado porque não havia nada configurado
para rejeitá-lo.

Não houve tentativa de contornar a proteção: não houve `--force`, `--no-verify`, alteração
de configuração nem uso de token elevado. O push simplesmente foi aceito.

### Impacto medido

| Dimensão                            | Estado                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| CI (`lint, test, build`) na `main`  | **verde** após o push                                                            |
| CodeQL                              | **verde**                                                                        |
| `db-schema-drill-required`          | **verde**                                                                        |
| Migration aplicada remotamente      | **nenhuma**                                                                      |
| Deploy (staging ou produção)        | **nenhum**                                                                       |
| Dado real tocado                    | **nenhum** — o repositório não tem dado real em lugar nenhum                     |
| Segredo exposto                     | **nenhum** — o diff é de scripts de comparação, sem credencial                   |
| Conteúdo do commit                  | correto; foi revisado depois e nada nele precisou ser revertido                  |

O impacto material é, portanto, **zero**. O impacto de controle não é: durante o intervalo
entre o push e o primeiro CI verde, `main` esteve num estado que nenhum gate havia
aprovado. Que o resultado tenha sido bom é sorte de conteúdo, não propriedade do processo —
e é exatamente essa distinção que o registro existe para preservar.

### Causa

Duas causas somadas, e as duas precisam ser nomeadas:

1. **Causa imediata:** o CTO executou `git push` estando com `main` em check-out, em vez de
   criar branch. Erro de execução, não de julgamento sobre a regra — a regra era conhecida.
2. **Causa estrutural:** `enforce_admins = false` transformava o erro de execução num erro
   com efeito. Um controle que depende de a pessoa não errar não é um controle.

Só a segunda é acionável por engenharia. A primeira é acionável por disciplina, e
disciplina não é mecanismo.

### O que **não** foi feito, e por quê

O histórico **não foi reescrito**. Nada de `revert`, `force-push` ou remoção do commit.
A decisão é do Founder/PMO e está registrada como tal.

O raciocínio: apagar o registro de um bypass administrativo usando **outro** privilégio
administrativo — force-push — substituiria uma violação por uma violação maior e mais
difícil de auditar, e destruiria a evidência que este documento descreve. O commit é
correto, está verde e permanece na história com este registro apontando para ele.

### Ação preventiva (aplicada)

`enforce_admins` da branch `main`: **`false` → `true`**.

Aplicado em 2026-08-05 pelo endpoint oficial dedicado
`POST /repos/{owner}/{repo}/branches/main/protection/enforce_admins`, e não por um `PUT`
do objeto de proteção inteiro. A escolha é deliberada: o `PUT` completo substitui o objeto,
de modo que qualquer campo omitido do payload é **redefinido** — um required check
esquecido na montagem do JSON some da proteção sem erro nenhum. O endpoint dedicado altera
um único campo por construção, o que torna impossível a classe de acidente que este próprio
registro trata.

Estado da proteção, comparado campo a campo antes e depois:

| Campo                             | Antes                                                                              | Depois       |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
| `enforce_admins`                  | `false`                                                                            | **`true`**   |
| `required_status_checks.strict`   | `true`                                                                             | `true`       |
| `required_status_checks.contexts` | `lint, test, build` · `Analyze (javascript-typescript)` · `db-schema-drill-required` | idênticos    |
| `required_approving_review_count` | `0`                                                                                | `0`          |
| `dismiss_stale_reviews`           | `true`                                                                             | `true`       |
| `allow_force_pushes`              | `false`                                                                            | `false`      |
| `allow_deletions`                 | `false`                                                                            | `false`      |
| `required_linear_history`         | `false`                                                                            | `false`      |
| `block_creations`                 | `false`                                                                            | `false`      |
| `required_conversation_resolution`| `false`                                                                            | `false`      |
| `lock_branch`                     | `false`                                                                            | `false`      |
| `restrictions`                    | nenhuma                                                                            | nenhuma      |

Exatamente um campo mudou. Nenhum check foi removido, renomeado ou relaxado, e nenhum
bypass novo foi criado.

**Consequência prática, registrada para não virar surpresa:** a partir de agora todo commit
em `main` — inclusive os do Founder e os do CTO — exige pull request com os três checks
verdes e a branch atualizada em relação a `main` (`strict=true`). Como
`required_approving_review_count` é `0`, o autor continua podendo mergear o próprio PR: o
gate é de **verificação automatizada**, não de revisor humano. Isso é intencional numa
equipe de uma pessoa — exigir aprovação de terceiro criaria um gate que ninguém pode
satisfazer, e um gate impossível é rapidamente desligado.

A proteção **não** foi testada por push direto. Verificar um controle disparando a ação que
ele deve impedir é uma forma de teste que só é aceitável quando falhar é barato; aqui, o
teste bem-sucedido seria indistinguível de repetir o incidente. A verificação foi feita
relendo a proteção pela API e comparando campo a campo, acima, e o primeiro PR aberto depois
da mudança serviu de confirmação de que o caminho legítimo continua funcionando.

### O que este registro não conclui

Não conclui que houve exposição de dado, comprometimento de credencial ou escrita remota.
Não houve. Também não conclui que o conteúdo do commit era ruim — não era. Conclui apenas
que um controle de processo falhou, que a falha era estruturalmente possível, e que a
possibilidade estrutural foi removida.
