# `db-schema-drill` como required check da `main`

**Status: resolvido em 04/08/2026.** O check `db-schema-drill-required` é obrigatório na
`main` desde o PR [#62](https://github.com/samuel3ssilva/vipreco/pull/62), e nada mais foi
alterado na proteção.

Este arquivo mantém a medida que explicava por que a versão anterior não podia ser aplicada —
ela não virou história inútil: é a razão de o desenho ser este e não o óbvio.

---

## 1. Proteção da `main`

| Item                         | Antes (04/08, manhã)                                    | Depois                           |
| ---------------------------- | ------------------------------------------------------- | -------------------------------- |
| required status checks       | `lint, test, build` · `Analyze (javascript-typescript)` | **+ `db-schema-drill-required`** |
| `strict` (branch atualizada) | `true`                                                  | `true`                           |
| aprovações obrigatórias      | 0                                                       | 0                                |
| `enforce_admins`             | `false`                                                 | `false`                          |
| force push                   | bloqueado                                               | bloqueado                        |
| deleção da branch            | bloqueada                                               | bloqueada                        |

O `PUT` foi montado a partir da leitura da proteção vigente, e não de um payload escrito à
mão. Depois, os dois estados foram comparados campo a campo: **só a lista de checks mudou**,
e só por acréscimo. Nada foi relaxado, nada foi removido, `enforce_admins` não foi tocado.

---

## 2. Por que a versão óbvia teria trancado a `main`

`.github/workflows/db-schema-drill.yml` tinha filtro `paths:` no nível do workflow: rodava
**só** quando o PR tocava `supabase/migrations/**`, `scripts/db-drill/**` ou o próprio
arquivo.

Quando o filtro não casa, o GitHub **não executa e não reporta** o check. E um required check
que nunca é reportado não fica "verde por omissão": ele fica _pendente para sempre_, e o PR
não fecha.

### A medida que mostrou isso

| PR                                                      | Tocou caminho filtrado?   | Check `reconstruir schema e validar autorizacao`              |
| ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| [#58](https://github.com/samuel3ssilva/vipreco/pull/58) | sim (`scripts/db-drill/`) | **presente**, `success`                                       |
| [#48](https://github.com/samuel3ssilva/vipreco/pull/48) | não (só `docs/`)          | **ausente**                                                   |
| [#60](https://github.com/samuel3ssilva/vipreco/pull/60) | não (só `docs/`)          | **ausente**; `mergeStateStatus: CLEAN` com os 3 checks verdes |

E na própria `main`: o drill rodou em `e203887` (mexeu em migrations) e **não** rodou em
`a0be553` (push documental).

Vale separar dois mecanismos parecidos, porque a confusão entre eles é a armadilha inteira:
job pulado por `if:` reporta `skipped`, e o GitHub trata `skipped` como satisfeito. Workflow
pulado por filtro de caminho **não reporta nada**. Só o segundo produz o travamento.

E travar não seria o pior. Com `enforce_admins = false`, o Founder conseguiria mergear por
bypass de administrador — o que é pior do que não ter o check: transforma cada PR de
documentação num merge com bypass, e bypass rotineiro deixa de ser exceção e vira o
procedimento.

---

## 3. O desenho que resolveu

O filtro `paths:` saiu do workflow, e a responsabilidade foi separada em três jobs:

```
detect  →  sempre roda. Decide se a mudança toca algo que o drill exercita.  (barato)
drill   →  só roda quando toca.  Docker + Postgres + 10 migrations + rollback.  (caro)
gate    →  SEMPRE roda, SEMPRE reporta.  Consolida os dois.
```

O required check é o **gate** (`db-schema-drill-required`), não o drill pesado. Assim o check
é reportado em todo PR, sem gastar um Postgres inteiro para validar Markdown, e sem que
nenhuma falha real seja mascarada:

| detector          | veredito | drill     | gate                           |
| ----------------- | -------- | --------- | ------------------------------ |
| success           | `true`   | success   | ✅ success                     |
| success           | `true`   | failure   | ❌ failure                     |
| success           | `true`   | cancelled | ❌ failure                     |
| success           | `false`  | skipped   | ✅ success                     |
| success           | `false`  | success   | ❌ failure (estado incoerente) |
| failure/cancelled | —        | —         | ❌ failure                     |
| success           | vazio    | —         | ❌ failure                     |

O detector **falha para o lado seguro**: sem base de comparação confiável (`workflow_dispatch`,
primeiro push, force push, revisão inexistente), o veredito é `true` e o drill roda. Errar
nessa direção custa um minuto de CI; errar na oposta deixa uma migration entrar na `main` sem
ninguém reconstruir o schema.

Caminhos vigiados: `supabase/migrations/`, `scripts/db-drill/`, `scripts/r2/` (o drill executa
`target-readiness.sql` e o SQL do preflight), `supabase/seed.sql`, `supabase/config.toml` e o
próprio workflow.

---

## 4. O que impede a regressão silenciosa

Reintroduzir o `paths:`, renomear o job do gate ou tirar o `if: always()` não quebraria
nenhum teste de produto — só faria o check exigido parar de ser reportado, e a `main` voltaria
a travar sem que ninguém entendesse por quê.

`scripts/db-drill/detect-relevant-changes.test.ts` cobre as duas coisas: a **decisão** do
detector (incluindo prefixo que não é substring) e o **desenho** do workflow. As três
armadilhas acima agora quebram a suíte.

O nome do contexto é `db-schema-drill-required` — o `name:` do **job**, não o do workflow.
Mudar essa linha quebra o required check em silêncio, e por isso ela tem comentário no YAML e
teste na suíte.

---

## 5. Medido depois de aplicar

| Caso                      | Onde                                                    | Resultado                                                                                           |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PR que toca o drill       | [#62](https://github.com/samuel3ssilva/vipreco/pull/62) | drill executado (15 s), gate `success` — log: `detector: success · veredito: true · drill: success` |
| PR que toca `scripts/r2/` | [#63](https://github.com/samuel3ssilva/vipreco/pull/63) | drill executado (13 s), gate `success`                                                              |
| PR só de documentação     | _este PR_                                               | **a medir** — é o caso que antes travaria, e é o que fecha a prova                                  |

O gate do #62 foi conferido no log, e não só pelo ✅: passar pelo motivo errado e passar pelo
motivo certo têm exatamente a mesma aparência na lista de checks.
