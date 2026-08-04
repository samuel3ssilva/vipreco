# Gate de aplicação remota de R2

**Status: NORMATIVO.** Este documento define quem autoriza a aplicação das migrations de
R2, sob quais condições, e o que explicitamente **não** está autorizado.
Procedimento operacional: [`R2-ROLLOUT-RUNBOOK.md`](./R2-ROLLOUT-RUNBOOK.md).
Decisão de governança: [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) DL-020.

---

## A regra

> **Merge no Git não é aplicação no banco.**

As migrations de R2 estão na `main`. Isso autoriza **a existência delas**, e mais nada.
Aplicar em staging ou em produção é decisão do Founder/PMO, tomada explicitamente, para um
ambiente por vez (princípio 14 do `CLAUDE.md`).

O CTO escreve migration. O Founder/PMO decide aplicar. As duas coisas não se substituem, e
nenhuma quantidade de teste verde troca a segunda pela primeira.

---

## Estado atual

| Item | Estado |
| --- | --- |
| `20260803010000_product_identity_quantity.sql` | versionada na `main`, **não aplicada** |
| `20260803020000_gtin_integrity.sql` | versionada na `main`, **não aplicada** |
| Backfill de quantidade (MVP-E1-08) | **não iniciado** |
| `VALIDATE CONSTRAINT` | **não executado** em constraint nenhuma |
| Conteúdo de `products` em staging | **NOT VERIFIED** — nunca consultado |
| Conteúdo de `products` em produção | **NOT VERIFIED** — nunca consultado |

O último item é o motivo de **todas** as constraints nascerem `NOT VALID`. Sem saber o que
existe no ambiente alvo, uma constraint validada na criação poderia falhar a aplicação
inteira; `NOT VALID` passa a valer para escrita nova imediatamente e adia a conferência das
linhas antigas para um passo que **pode falhar de propósito**.

---

## Quem autoriza o quê

| Ato | Quem decide | Quem executa |
| --- | --- | --- |
| escrever migration | CTO | CTO |
| mergear na `main` | CTO, com CI verde | CTO |
| **aplicar em staging** | **Founder/PMO** | quem o Founder/PMO nomear |
| **aplicar em produção** | **Founder/PMO**, em decisão separada da de staging | idem |
| aprovar linha de backfill | **Founder/PMO** | idem |
| `VALIDATE CONSTRAINT` | **Founder/PMO** | idem |
| tornar campos `NOT NULL` | **Founder/PMO**, com migration própria e gate próprio | idem |

Autorização para staging **não** se estende a produção. São dois atos, com dois registros.

---

## Condições para abrir o gate

Todas precisam estar satisfeitas. Qualquer uma em aberto mantém o gate fechado.

1. [ ] FASE 0 do runbook integralmente cumprida, com backup verificado
2. [ ] FASE 1 executada, e a saída arquivada como evidência
3. [ ] **consulta 2 (GTIN inválido) devolveu vazio** — ou, se não devolveu, a curadoria já
       foi feita e registrada, e a consulta foi rodada de novo
4. [ ] preview de backfill executado e revisado linha a linha (FASE 2)
5. [ ] ambiente alvo nomeado explicitamente, um só
6. [ ] executor com credencial de `service_role` — sem isso a FASE 5 não escreve
7. [ ] rollback lido, e o ponto sem volta (FASE 5) compreendido
8. [ ] staging aplicado e observado antes de qualquer passo em produção

---

## O que este gate NÃO autoriza, em nenhuma hipótese

- aplicar as duas migrations num único passo sem verificar a primeira
- backfill antes da revisão humana linha a linha
- promover `parsed` a `confirmed` automaticamente
- `VALIDATE CONSTRAINT` antes do backfill completo
- `NOT NULL` antes de cobertura suficiente
- corrigir, completar ou inventar GTIN — **o ViPreço nunca gera um código**
- afrouxar constraint para o `VALIDATE` passar
- alterar RLS, policy ou grant de tabela: R2 não toca em nenhum dos três
- deploy do Worker: R2 não tem superfície de interface
- cadastrar dado real

---

## Se algo falhar

| Sintoma | Leitura | Ação |
| --- | --- | --- |
| `VALIDATE CONSTRAINT` falha | há linha antiga que viola a regra | olhar a linha; **não** afrouxar a constraint |
| `unique_violation` no backfill | duas linhas aprovadas produzem a mesma identidade exata | voltar à FASE 2 para aquelas duas; consulta 6 lista os casos |
| `permission denied for function pa_is_valid_gtin` | está escrevendo com papel sem `EXECUTE` | escrever como `service_role` (ver fato 1 do runbook) |
| coluna nova já existe na FASE 3 | a migration já foi aplicada antes | parar e reconciliar o estado real antes de seguir |
| consulta 3 devolve GTIN duplicado | `products_gtin_unique_idx` não está neste ambiente | é divergência de **schema**, não de dado — parar |

Em todos os casos: registrar, não improvisar. Um passo que falhou e foi contornado no
improviso é pior do que um passo que falhou e parou.
