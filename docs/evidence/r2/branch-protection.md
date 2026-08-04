# `db-schema-drill` como required check da `main`

**Status: não foi tornado obrigatório.** Não por esquecimento, e não só por limite de
ferramenta: tornar obrigatório **hoje, do jeito direto**, trancaria a `main` para todo PR que
não mexe em migration. Este arquivo registra a medida que mostra isso e a ação humana exata.

---

## 1. Estado atual da proteção da `main` (lido em 2026-08-04)

| Item                         | Valor                                                   |
| ---------------------------- | ------------------------------------------------------- |
| required status checks       | `lint, test, build` · `Analyze (javascript-typescript)` |
| `strict` (branch atualizada) | `true`                                                  |
| aprovações obrigatórias      | 0                                                       |
| `enforce_admins`             | `false`                                                 |
| force push                   | bloqueado                                               |
| deleção da branch            | bloqueada                                               |

Nada disso foi alterado. A proteção continua exatamente como estava.

---

## 2. O problema: o workflow é filtrado por caminho

`.github/workflows/db-schema-drill.yml` roda **só** quando o PR toca
`supabase/migrations/**`, `scripts/db-drill/**` ou o próprio arquivo do workflow.

Quando o filtro não casa, o GitHub **não executa e não reporta** o check. E um required
check que nunca é reportado não fica "verde por omissão": ele fica _pendente para sempre_, e
o PR não fecha.

### A medida

| PR                                                                | Tocou caminho filtrado?   | Check `reconstruir schema e validar autorizacao`              |
| ----------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| [#58](https://github.com/samuel3ssilva/vipreco/pull/58)           | sim (`scripts/db-drill/`) | **presente**, `success`                                       |
| [#48](https://github.com/samuel3ssilva/vipreco/pull/48)           | não (só `docs/`)          | **ausente**                                                   |
| [#60](https://github.com/samuel3ssilva/vipreco/pull/60) — este PR | não (só `docs/`)          | **ausente**; `mergeStateStatus: CLEAN` com os 3 checks verdes |

O PR #60 é o caso decisivo, e é este mesmo: hoje ele está `CLEAN`. Com o drill exigido e o
filtro de caminho no lugar, ele passaria a `BLOCKED` sem nada para destravá-lo — o workflow
não roda, então não há o que esperar.

Vale dizer o que **não** é o caso, para não confundir dois mecanismos parecidos: job pulado
por `if:` reporta `skipped` e o GitHub trata como satisfeito. Workflow pulado por filtro de
caminho não reporta nada. A diferença é exatamente esta, e é ela que produz o travamento.

---

## 3. Por que não foi aplicado assim mesmo

Duas razões, e a segunda é a que decide:

1. **A escrita foi negada pela camada de permissão desta sessão.** A chamada
   `PUT /repos/…/branches/main/protection` não chegou a ser executada. A proteção foi lida de
   novo depois e está intacta.
2. **Mesmo autorizada, aplicá-la sozinha seria o erro.** Ela trancaria todo PR documental,
   inclusive este. Como `enforce_admins` é `false`, o Founder conseguiria mergear por bypass
   de administrador — o que é pior do que não ter o check: transforma cada PR de documentação
   num merge com bypass, e bypass rotineiro deixa de ser exceção e vira o procedimento.

O mandato desta missão proíbe alterar workflows, então a correção completa — que **precisa**
mexer no workflow — fica registrada aqui como proposta, não aplicada.

---

## 4. A ação humana, na ordem certa

**Passo 1 — fazer o job sempre reportar.** Em `db-schema-drill.yml`, tirar os filtros
`paths:` dos gatilhos e mover a condição para dentro do job, que passa a rodar sempre e a
sair cedo quando não houver o que testar. Assim o check é reportado em todo PR, com
`success` quando não há migration a reconstruir.

**Passo 2 — só então exigir o check.** Preservando tudo o que já existe:

```bash
gh api -X PUT repos/samuel3ssilva/vipreco/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "lint, test, build", "app_id": 15368 },
      { "context": "Analyze (javascript-typescript)", "app_id": 15368 },
      { "context": "reconstruir schema e validar autorizacao", "app_id": 15368 }
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
```

O nome do contexto é `reconstruir schema e validar autorizacao` — o `name:` do job, não o
`name:` do workflow. `app_id: 15368` é o GitHub Actions.

**Passo 3 — conferir.** Abrir um PR que só mexe em `docs/` e confirmar que ele chega a
`CLEAN`; abrir um que mexe em `supabase/migrations/` e confirmar que o drill roda de fato.
Se o primeiro ficar `BLOCKED`, o passo 1 não funcionou — e aí é desfazer o passo 2, não
mergear por bypass.

---

## 5. Enquanto isso

O drill **não** deixa de ser obrigatório na prática. Ele foi conferido à mão em cada um dos
cinco merges de R2 (PRs #54, #55, #56, #58 e #59), e a ausência do required check não
autoriza pular essa conferência antes de qualquer aplicação remota.

Pendência registrada como **BRANCH PROTECTION HUMAN ACTION REQUIRED**.
