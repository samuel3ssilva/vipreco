# Evidências de R2 — aplicação remota

**Status: DESCRITIVO.** Registro do que foi medido, quando, com qual credencial e com qual
limitação. Não decide nada: a norma está em
[`../../data/R2-APPLICATION-GATE.md`](../../data/R2-APPLICATION-GATE.md) e o procedimento em
[`../../data/R2-ROLLOUT-RUNBOOK.md`](../../data/R2-ROLLOUT-RUNBOOK.md).

| Arquivo | O que registra |
| --- | --- |
| [`staging/README.md`](./staging/README.md) | índice e veredito do preflight de staging |
| [`staging/preflight.md`](./staging/preflight.md) | ambientes, schema, dados, GTIN, backup, preview e smoke test |
| [`staging/application.md`](./staging/application.md) | o gate G1–G15 e o registro de que **nada foi aplicado** |
| [`branch-protection.md`](./branch-protection.md) | por que o `db-schema-drill` ainda não é required check |

---

## A regra de leitura destes arquivos

Cada afirmação aqui vem com **como foi medida**. Onde não foi medida, está escrito
`NOT VERIFIED` — e `NOT VERIFIED` não é sinônimo de "provavelmente está certo".

Nenhum arquivo desta pasta contém token, connection string, chave, senha, host completo de
banco, conteúdo de linha sensível ou dado pessoal. GTIN, quando precisa aparecer, aparece
mascarado nos últimos quatro dígitos, e o produto é identificado pelo `id`.
