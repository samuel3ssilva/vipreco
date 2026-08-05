# Evidência — aplicação controlada de R2 em staging (R2.6)

**Data:** 2026-08-05
**Ambiente:** staging apenas. **O banco de produção não foi contatado em nenhum momento.**
**Workflow:** [`r2-staging-apply.yml`](../../../.github/workflows/r2-staging-apply.yml)
**Runbook:** [`R2-CONTROLLED-APPLY-RUNBOOK.md`](../../data/R2-CONTROLLED-APPLY-RUNBOOK.md)

---

## A sequência, com o run de cada operação

| #   | Operação                       | Run                                                                              |  Histórico  | Resultado                                                     |
| --- | ------------------------------ | -------------------------------------------------------------------------------- | :---------: | ------------------------------------------------------------- |
| —   | `plan`                         | [31054403130](https://github.com/samuel3ssilva/vipreco/actions/runs/31054403130) |      0      | achou defeito no instrumento — ver abaixo                     |
| —   | `plan`                         | [31054702564](https://github.com/samuel3ssilva/vipreco/actions/runs/31054702564) |      0      | `CONTROLLED STAGING APPLY PLAN READY`                         |
| 1   | `adopt-seven-baseline`         | [31055051938](https://github.com/samuel3ssilva/vipreco/actions/runs/31055051938) |  0 → **7**  | `migration repair --status applied`, sete versões             |
| 2   | `apply-normalization`          | [31055113873](https://github.com/samuel3ssilva/vipreco/actions/runs/31055113873) |  7 → **8**  | zero colisões medidas imediatamente antes                     |
| 3   | `apply-core-hardening`         | [31055169780](https://github.com/samuel3ssilva/vipreco/actions/runs/31055169780) |      8      | **FALHOU** — `permission denied to change default privileges` |
| 3   | `apply-core-hardening`         | [31055658002](https://github.com/samuel3ssilva/vipreco/actions/runs/31055658002) |  8 → **9**  | aplicada depois da correção                                   |
| 4   | `apply-contribution-hardening` | [31055731237](https://github.com/samuel3ssilva/vipreco/actions/runs/31055731237) | 9 → **10**  | herança de tabela cortada                                     |
| 5   | `remediate-demo-gtins`         | [31055768950](https://github.com/samuel3ssilva/vipreco/actions/runs/31055768950) |     10      | 2 GTINs → NULL, `ROW_COUNT = 2`                               |
| 6   | `apply-r2a`                    | [31055808115](https://github.com/samuel3ssilva/vipreco/actions/runs/31055808115) | 10 → **11** | migration aplicada; **G7-POST reprovou**                      |
| —   | `validate`                     | [31056693264](https://github.com/samuel3ssilva/vipreco/actions/runs/31056693264) |     11      | **G7-POST PASS** depois da correção                           |
| 7   | `apply-r2b`                    | [31056766273](https://github.com/samuel3ssilva/vipreco/actions/runs/31056766273) | 11 → **12** | **G7-POST-GTIN PASS**                                         |
| —   | `validate`                     | [31056822806](https://github.com/samuel3ssilva/vipreco/actions/runs/31056822806) |     12      | estado final confirmado                                       |

## Estado final medido

| Fato                                                                 | Valor                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Histórico remoto de migrations                                       | **12**                                                                                                                                                                                                      |
| `markets` / `products` / `prices`                                    | 4 / 7 / 22                                                                                                                                                                                                  |
| `price_submissions` / `product_watch_requests` / `decision_feedback` | 0 / 1 / 0                                                                                                                                                                                                   |
| GTINs inválidos                                                      | **0**                                                                                                                                                                                                       |
| GTINs duplicados                                                     | 0                                                                                                                                                                                                           |
| G7-POST                                                              | **PASS**                                                                                                                                                                                                    |
| G7-POST-GTIN                                                         | **PASS**                                                                                                                                                                                                    |
| Worker de staging                                                    | HTTP 200 em `/`, `/buscar`, `/como-funciona`, `/para-mercados`, `/produto/:id`, com todos os headers de segurança ([uptime 31056908286](https://github.com/samuel3ssilva/vipreco/actions/runs/31056908286)) |

As contagens são **idênticas** às medidas antes da primeira operação. Nenhuma linha foi
criada ou apagada em nenhum passo.

## Os três defeitos que a sequência encontrou, e o que cada um ensinou

### 1. A contagem das tabelas centrais voltava "não lido"

O primeiro `plan` rodou **verde** e mostrou `markets`, `products` e `prices` como não lidos.
`20-content.sql` emite dois formatos — composto para catálogo, número puro para contribuição
— e a leitura só entendia o segundo.

`null` significa "não lido", e a verificação posterior **pula** o que não foi lido. Ou seja:
a comparação de contagem estava pulando justamente as três tabelas cujo total importa. A
guarda parecia existir e não existia.

O `plan` é read-only e roda antes de qualquer escrita. Foi para isso que ele existiu.

### 2. O hardening morria no `ALTER DEFAULT PRIVILEGES`

`permission denied to change default privileges (SQLSTATE 42501)`. A migration media o papel
em `pg_default_acl` — o que respondia _"qual papel"_, e não _"posso alterar esse papel"_.

Como a migration é transacional, a falha revertia **também** as revogações de tabela, que são
o achado P0 e o único que fecha o `TRUNCATE`. A correção trata `insufficient_privilege` por
papel e registra o resto, em vez de trocar a correção crítica por uma proteção acessória.

O resultado medido depois: o default do papel `postgres` em `public` não concede mais nada a
`anon` nem a `authenticated`.

### 3. G7-POST misturava dois momentos

Ele chamava `pa_is_valid_gtin()`, função que **R2-B** cria, mas rodava logo depois de
**R2-A**. Um ambiente correto reprovava.

É a mesma circularidade que R2.4 desfez ao separar PRE de POST, um nível abaixo e dentro de
um arquivo só: **um arquivo que mistura dois momentos só pode passar num deles.** A consulta
mudou de arquivo, e G7 passou a rodar também no `validate` — porque uma migration aplicada
não pode ser reaplicada, e um gate irrepetível é um gate que trava a operação quando falha
por defeito próprio.

## O que continua não autorizado

Backfill de quantidade. `parsed → confirmed`. `VALIDATE CONSTRAINT`. Deploy. Dado real.
**Qualquer contato com o banco de produção.**
