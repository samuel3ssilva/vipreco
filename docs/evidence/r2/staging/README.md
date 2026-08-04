# Preflight de staging para R2 — índice e veredito

**Medido em 2026-08-04.** `main` em `e203887`.

| Documento                            | Conteúdo                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| [`preflight.md`](./preflight.md)     | ambientes, credenciais, histórico, schema, dados, GTIN, preview, smoke test, backup |
| [`application.md`](./application.md) | gate G1–G15, causa raiz, ações humanas e veredito                                   |

---

## Veredito

**CREDENTIAL ACCESS REQUIRED.** Nenhuma migration foi aplicada.

|                      |                                                                |
| -------------------- | -------------------------------------------------------------- |
| Gate G1–G15          | 8 `PASS`, 3 `UNKNOWN`, **4 `FAIL`**                            |
| Migrations aplicadas | **nenhuma**                                                    |
| Escritas emitidas    | **nenhuma**                                                    |
| Deploys              | **nenhum** — staging segue em `862a179`, produção em `b88e514` |
| Banco de produção    | **não contatado**                                              |

---

## Os três fatos que este preflight acrescentou

1. **Staging passou de `NOT VERIFIED` a medido.** Até hoje o `R2-APPLICATION-GATE.md` dizia
   que o conteúdo de `products` em staging nunca havia sido consultado. Agora foi — pelo que
   a Data API pública deixa ver, que é bastante e não é tudo.

2. **As colunas não têm divergência, e R2-A não foi aplicada.** As três tabelas batem
   exatamente com o esperado depois das oito migrations anteriores a R2, e as quatro colunas
   novas respondem `42703` (_a coluna não existe_), não `42501` (_permissão negada_) — a
   distinção é o que torna isso prova, e não impressão.

3. **Dois GTINs fictícios inválidos ainda vivem em staging.** São os mesmos dois que o
   commit `1102967` anulou no seed versionado em 03/08. Staging foi semeado em 27/07 e nunca
   re-semeado: o repositório está certo, o ambiente está velho. Aplicar R2-B passaria
   (`NOT VALID` não confere linha antiga); quem falharia é a FASE 6.

---

## O que falta, e de quem é

A causa raiz é uma só: **não existe neste ambiente credencial capaz de escrever em staging,
nem de ler o catálogo do sistema.** Sem `service_role`, sem senha de banco, sem access token,
sem a CLI `supabase`. Três dos quatro `FAIL` decorrem disso.

A ordem de resolução está em [`application.md`](./application.md) §5. O primeiro passo é do
Founder e não é técnico: decidir **como** o acesso de staging será concedido.
