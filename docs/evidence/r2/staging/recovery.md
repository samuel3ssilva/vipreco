# Recuperação de staging sem backup pago — R2.3C

**Registrado em 2026-08-05.** `main` em `f7c3aa3`.

O plano Supabase é Free e não tem backup nativo. A pergunta desta página não é "como
comprar backup", é: **staging precisa de backup, ou é integralmente reconstruível a partir de
arquivo versionado?**

Se for reconstruível, perder staging custa minutos de CI — não custa informação. Isso não
substitui backup de **produção**, e esta página não afirma nada sobre produção.

---

## 1. O critério, e por que ele é conjuntivo

G6 só pode virar `PASS` quando **todas** as nove condições valem. Uma só falsa derruba o
conjunto, porque a garantia é "nada se perde", e basta um registro não reproduzível para a
frase ficar falsa.

| #   | Condição                                                      | Estado           | Como foi (ou seria) verificada           |
| --- | ------------------------------------------------------------- | ---------------- | ---------------------------------------- |
| 1   | dados classificados como `DEMO ONLY` ou `EMPTY`               | **NÃO MEDIDO**   | exige leitura remota                     |
| 2   | nenhum dado pessoal                                           | **NÃO MEDIDO**   | exige leitura remota                     |
| 3   | nenhum dado de piloto                                         | **NÃO MEDIDO**   | exige leitura remota                     |
| 4   | nenhum registro de origem desconhecida                        | **NÃO MEDIDO**   | exige leitura remota                     |
| 5   | schema integralmente representado pelas migrations            | **PASS**         | drill: 10 migrations reconstroem do zero |
| 6   | dados integralmente representados por seed/fixture versionado | **PASS**         | `96-seed-rebuild.sql`, PR #70            |
| 7   | reconstrução desde zero comprovada no schema drill            | **PASS**         | schema **e** dado, PR #70                |
| 8   | contagens e identidades conferem                              | **PASS (local)** | contagens exatas, não `>= 1`             |
| 9   | perda total de staging não causaria perda irreproduzível      | **NÃO MEDIDO**   | depende de 1–4                           |

**G6 permanece `FAIL`.** Quatro condições dependem de ler o banco, e a credencial foi recusada
(ver [`automation.md`](../automation.md) §8B e §8C).

Mas a metade que depende só de arquivo versionado **saiu de "presumida" para "provada"**, e
essa distinção é o resultado desta seção.

---

## 2. O que o drill provava, e o que passou a provar

Até o PR #70 o drill reconstruía o **schema** e mais nada. O `supabase/seed.sql` nunca era
aplicado.

Isso era meia prova apresentada como prova inteira — e meia prova de reconstrução só se revela
insuficiente no dia em que alguém precisa reconstruir de verdade, que é o pior dia possível
para descobrir.

Agora o drill aplica o seed **duas vezes** e confere:

| Verificação            | O que pega                                                                     |
| ---------------------- | ------------------------------------------------------------------------------ |
| contagens **exatas**   | perda **e** duplicação — o seed já duplicou preços antes de ter `id` explícito |
| `is_demo = true`       | dado versionado que escapasse para "real"                                      |
| dígito verificador GS1 | a volta dos dois GTINs que o commit `1102967` anulou                           |
| GTIN duplicado         | colisão de identidade                                                          |
| **idempotência**       | seed que duplica na segunda aplicação                                          |

A idempotência não é preciosismo: recuperação de emergência raramente acontece de primeira, e
um seed que duplica na segunda passada exige um banco perfeitamente limpo — exatamente o que
quem está recuperando não tem.

Confirmado no CI ([run 30969312419](https://github.com/samuel3ssilva/vipreco/actions/runs/30969312419)):

```
==> Reconstrucao de dado: aplicando supabase/seed.sql (1 de 2)...
==> Reaplicando o mesmo seed para provar idempotencia (2 de 2)...
==> Aplicando: assertions de reconstrucao do seed (96-seed-rebuild.sql)
 seed.rebuild | ok
```

---

## 3. Matriz de reprodutibilidade

Lado **versionado** — medido:

| Conjunto                                                           | Origem                      | Versionado | Reproduzível                                                       | Divergência             | Recuperável |
| ------------------------------------------------------------------ | --------------------------- | ---------- | ------------------------------------------------------------------ | ----------------------- | ----------- |
| schema (tabelas, índices, constraints, funções, policies, grants)  | `supabase/migrations/` (10) | sim        | **sim**                                                            | nenhuma no drill        | **sim**     |
| `markets` (4 linhas)                                               | `supabase/seed.sql`         | sim        | **sim**                                                            | contagem exata          | **sim**     |
| `products` (7 linhas)                                              | `supabase/seed.sql`         | sim        | **sim**                                                            | contagem exata          | **sim**     |
| `prices` (22 linhas)                                               | `supabase/seed.sql`         | sim        | **sim**                                                            | contagem exata          | **sim**     |
| GTINs (5 distintos)                                                | `supabase/seed.sql`         | sim        | **sim**                                                            | 0 inválido, 0 duplicado | **sim**     |
| `price_submissions`, `product_watch_requests`, `decision_feedback` | —                           | n/a        | **sim** (vazias por construção: INSERT público revogado na Onda 3) | —                       | **sim**     |

Lado **remoto** — não medido:

| Pergunta                                       | Estado         |
| ---------------------------------------------- | -------------- |
| staging contém exatamente isto, e nada além?   | **NÃO MEDIDO** |
| existe linha de origem desconhecida?           | **NÃO MEDIDO** |
| existe dado pessoal ou de piloto?              | **NÃO MEDIDO** |
| as contagens remotas batem com as versionadas? | **NÃO MEDIDO** |

A R2.2 já havia observado, pela chave anônima, que **tudo que é visível é demo**. Isso não
fecha as quatro linhas acima: `anon` não enumera linha inativa, e "não vi nada estranho" com um
instrumento que não enxerga tudo não é o mesmo que "não há nada estranho".

---

## 4. Um achado sobre staging que a matriz torna preciso

A R2.2 registrou que staging tem dois produtos com GTIN de dígito verificador inválido, e que
os mesmos valores foram anulados no seed versionado pelo commit `1102967`.

A matriz explica isso sem ambiguidade: **o repositório está correto e o ambiente está velho.**
Staging foi semeado em 27/07 e nunca re-semeado. Não é divergência de conteúdo entre duas
fontes legítimas — é uma cópia desatualizada de uma fonte que já foi corrigida.

Consequência prática: realinhar staging com o seed versionado resolve G8 **e** confirma a
linha 1 da matriz de uma vez. É uma escrita, e portanto é decisão do Founder/PMO.

---

## 5. O veredito, e o que ele não autoriza

**`STAGING REBUILD RECOVERY VERIFIED (metade versionada)`**

O que está provado: schema e dado de staging são integralmente reconstruíveis a partir de
arquivos versionados, e a reconstrução é idempotente e conferida.

O que **não** está provado, e não pode ser afirmado: que staging hoje contém apenas isso.

Por isso:

- reconstrução controlada **é** a estratégia de recuperação de staging — e não backup pago;
- isso **não** é backup de produção, e não conclui o passo geral de backup;
- **G6 continua `FAIL`**, e o passo 11 do rollout continua parcialmente aberto;
- nenhuma escrita foi executada, aqui ou em qualquer lugar.

Uma reconstrução que se anuncia verificada sem que ninguém tenha olhado o ambiente é a mesma
classe de erro que um backup que nunca foi restaurado: parece cobertura, e só falha quando é
necessária.
