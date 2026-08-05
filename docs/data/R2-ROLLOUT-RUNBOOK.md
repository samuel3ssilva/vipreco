# Runbook de rollout de R2 — identidade estruturada e integridade de GTIN

**Status: NORMATIVO** para a operação de aplicação das migrations de R2.
Decisão de governança correspondente: [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) DL-020.
Gate humano e critérios de autorização: [`R2-APPLICATION-GATE.md`](./R2-APPLICATION-GATE.md).

---

## O que este runbook cobre

Duas migrations existem versionadas na `main` e **não foram aplicadas em ambiente nenhum**:

| Migration                                      | O que faz                                                                                                                                 | Card                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `20260803010000_product_identity_quantity.sql` | acrescenta `package_type`, `quantity_value`, `quantity_unit`, `units_per_package` (todas nullable) e o índice parcial de identidade exata | MVP-E1-01, MVP-E1-02 |
| `20260803020000_gtin_integrity.sql`            | valida formato e dígito verificador GS1 de `products.gtin`, sem tocar no valor de nenhuma linha                                           | MVP-E1-05            |

**Merge não é aplicação.** As duas estão no Git porque o Git é o lugar delas; aplicar em
staging ou em produção é decisão do Founder/PMO, sempre (princípio 14 do `CLAUDE.md`).

---

## Antes de qualquer coisa: três fatos que mudam a operação

Estes três foram descobertos ao provar as migrations contra Postgres vivo, e não estavam
óbvios em nenhum documento anterior. Ler antes da FASE 0.

### 1. Quem escreve em `products` precisa de `EXECUTE` em `pa_is_valid_gtin`

Depois de R2-B aplicada, **toda** escrita em `products` feita por um papel sem `EXECUTE`
nessa função falha com:

```
permission denied for function pa_is_valid_gtin
```

— inclusive escrita com `gtin` nulo, porque o `CHECK` é avaliado de qualquer jeito. A
barreira é de **escrita**, não de dado.

Nenhum papel real é afetado hoje: `anon` e `authenticated` não escrevem em `products`
desde a Onda 3, e `service_role` recebe o `GRANT` na própria migration. Mas o backfill da
FASE 5 **precisa ser feito como `service_role`** (ou `postgres`), sob pena de um erro que
aponta para uma função que ninguém chamou.

> A versão original do comentário da migration afirmava o contrário — que a expressão de um
> `CHECK` não exigiria `EXECUTE`. Estava errado. Ficou corrigido, e agora é assertion do
> drill, com os dois lados do contraste.

### 2. `quantity_value` é o conteúdo **TOTAL** da embalagem

Para um pack, é o total, e **não** o conteúdo de cada item: `"6 × 350 ml"` é `2100 ml` com
`units_per_package = 6` ([`MVP-DATA-CONTRACT.md`](./MVP-DATA-CONTRACT.md) §2).

`units_per_package` **não entra na identidade**. O que separa um pack de 6 de um pack de 12
é o total. Preencher `350` no lugar de `2100` não produz um erro de digitação: produz dois
SKUs diferentes disputando a mesma identidade, e o segundo é recusado pelo índice único.

### 3. Aplicar a migration dentro de uma transação explícita

`supabase migration up` já envolve cada arquivo numa transação. **O editor SQL do painel
não** — ele executa statement a statement. Colar a migration lá sem `BEGIN`/`COMMIT` deixa
estado parcial se algo falhar no meio, e `ADD CONSTRAINT` não tem `IF NOT EXISTS` para
socorrer na segunda tentativa.

Se a aplicação for pelo editor SQL, envolver o arquivo inteiro:

```sql
BEGIN;
-- conteúdo integral da migration
COMMIT;
```

---

## FASE 0 — Pré-condições

Nada começa sem estes itens confirmados **por escrito**, no registro da execução:

- [ ] backup do ambiente alvo verificado, e o procedimento de restauração **já testado**
      alguma vez (ver [`../operations/RESILIENCE-RUNBOOK.md`](../operations/RESILIENCE-RUNBOOK.md))
- [ ] credencial de `service_role` do ambiente alvo disponível para quem vai executar
- [ ] ambiente alvo identificado sem ambiguidade (staging **ou** produção — nunca "os dois")
- [ ] janela de execução acordada, fora de horário de uso
- [ ] responsável nomeado pela execução, e responsável nomeado pela decisão
- [ ] SHA da `main` registrado, e as migrations conferidas nesse SHA
- [ ] as **10** migrations esperadas presentes em `supabase/migrations/`
- [ ] nenhum deploy concorrente em andamento (os dois workflows de deploy são
      `workflow_dispatch`; confirmar que ninguém disparou)
- [ ] plano de rollback lido, e o executor sabe qual é o **ponto sem volta** (FASE 5)

---

## FASE 1 — Auditoria read-only

**Nada é escrito nesta fase.**

Em **staging**, o caminho preferido é o workflow, não o editor SQL: disparar
[`r2-staging-preflight.yml`](../../.github/workflows/r2-staging-preflight.yml) por
`workflow_dispatch`. Ele responde as consultas abaixo e mais o que elas não alcançam — índices,
constraints, funções, policies, grants, linhas inativas e o histórico de migrations —, e devolve
tudo num Job Summary sanitizado, com os gates verificáveis por leitura já avaliados.

Três razões para preferi-lo a rodar SQL à mão:

- o read-only é **estrutural** (guarda estática, transação `READ ONLY`, verificação no banco),
  em vez de depender de quem executa colar a consulta certa;
- o host é **derivado** do project ref de staging versionado, e o runner recusa a execução se a
  cadeia de guarda não conseguir provar o ambiente;
- a saída é sanitizada por construção: GTIN mascarado, nenhuma linha de tabela, nenhum host.

Pré-requisito: o Environment Secret **`SUPABASE_DB_PASSWORD`** no ambiente `staging`, contendo
**somente a Database password** de staging — nada de URI, nunca a `service_role`, nunca a senha
de produção. Sem ele o workflow para com `STAGING DATABASE PASSWORD SECRET REQUIRED`, não abre
conexão e **não tenta nenhuma credencial alternativa**.

O segredo composto anterior (`SUPABASE_DB_URL`) foi retirado do caminho na R2.3D: dos cinco
campos daquela URI, quatro já eram versionados e um só era segredo, e montar os quatro à mão
para decompô-los depois produziu cinco defeitos que devolviam sempre
`password authentication failed`. Ver [`../evidence/r2/automation.md`](../evidence/r2/automation.md)
§8D.

Para **produção** — e para staging, se por algum motivo o workflow não puder ser usado — rodar
[`../../scripts/r2/target-readiness.sql`](../../scripts/r2/target-readiness.sql) no ambiente
alvo, na ordem, e guardar a saída inteira como evidência. Note que a **consulta 2 devolve GTIN
completo**: essa saída é evidência interna, não vai para log de CI nem para issue.

| Consulta | Pergunta                                                            | O que fazer com a resposta                                               |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1        | quantos produtos, quantos com GTIN, quantos com `size_text`         | dá tamanho ao trabalho da FASE 2                                         |
| 2        | **quais GTINs são inválidos**                                       | se vier qualquer linha → **PARAR**, ver abaixo                           |
| 3        | há GTIN duplicado?                                                  | esperado vazio; linha aqui = divergência de schema, não de dado          |
| 4        | os objetos que R2 espera existem, e os que ela vai criar ainda não? | qualquer "presente" onde se espera ausente = migration já aplicada antes |

Em seguida, o preview de backfill (read-only, sem credencial, sem conexão):

```bash
bun scripts/backfill-preview.ts <arquivo.json>
```

onde o arquivo vem de `SELECT id, name, brand, variant, size_text FROM public.products;`.

Códigos de saída: `0` nada a revisar · `10` há linhas para decisão humana (**não é falha**)
· `2` entrada inválida · `1` erro operacional.

**Se a consulta 2 devolver qualquer linha:** parar a frente de GTIN. Corrigir ou anular um
GTIN é curadoria do Founder/PMO, nunca do CTO, e nunca automática — um GTIN válido pertence
a algum produto real, e o ViPreço não inventa código. A frente de R2-A pode seguir; ela não
depende disso.

---

## FASE 2 — Revisão humana

- [ ] cada linha proposta pelo preview revisada individualmente, contra a embalagem real
- [ ] aprovadas e rejeitadas registradas separadamente
- [ ] ambiguidades **não** resolvidas por palpite: `ambigua`, `nao_suportada` e
      `exige_revisao` ficam sem quantidade estruturada até alguém olhar o produto
- [ ] `conflito` decidido caso a caso — unir ou separar dois produtos é decisão do
      Founder/PMO
- [ ] evidência arquivada: o relatório, as decisões, e quem decidiu

**`parsed` nunca vira `confirmed` automaticamente.** O parser propõe; a aprovação é ato
humano. É a regra que separa "o texto sugere 500 g" de "este produto tem 500 g".

---

## FASE 3 — Aplicação de R2-A

- [ ] aplicar `20260803010000_product_identity_quantity.sql`, **dentro de uma transação**
- [ ] confirmar com a consulta 4: as quatro colunas passam a existir
- [ ] confirmar com a consulta 5: **toda linha está com `NULL` nas quatro** — a migration
      não faz backfill, e qualquer número diferente de zero aqui significa escrita fora do
      fluxo de revisão
- [ ] confirmar com a consulta 7: as cinco constraints existem com `ja_validada = false`
      (`NOT VALID` é o estado correto até a FASE 6)
- [ ] nenhuma obrigatoriedade é criada nesta fase; `NOT NULL` é outra migration, outro gate

**Rollback desta fase** (seguro enquanto não houver dado nas colunas novas — o bloco exato
está no fim da própria migration):

```sql
DROP INDEX IF EXISTS public.products_exact_identity_idx;
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_quantity_pair_complete,
  DROP CONSTRAINT IF EXISTS products_units_per_package_positive,
  DROP CONSTRAINT IF EXISTS products_quantity_value_positive,
  DROP CONSTRAINT IF EXISTS products_quantity_unit_check,
  DROP CONSTRAINT IF EXISTS products_package_type_check;
ALTER TABLE public.products
  DROP COLUMN IF EXISTS units_per_package,
  DROP COLUMN IF EXISTS quantity_unit,
  DROP COLUMN IF EXISTS quantity_value,
  DROP COLUMN IF EXISTS package_type;
```

---

## FASE 4 — Aplicação de R2-B

- [ ] **a consulta 2 da FASE 1 precisa estar vazia** — se não estiver, esta fase não começa
- [ ] aplicar `20260803020000_gtin_integrity.sql`, dentro de uma transação
- [ ] confirmar que `anon` e `authenticated` **não** têm `EXECUTE` nas duas funções novas
      (a plataforma Supabase concede sozinha; a migration revoga explicitamente)
- [ ] confirmar que `service_role` **tem** `EXECUTE` — sem isso, a FASE 5 não escreve nada
- [ ] confirmar com a consulta 7 que `products_gtin_valid` existe com `ja_validada = false`

**Rollback desta fase** (nesta ordem — a constraint depende da função):

```sql
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_gtin_valid;
DROP FUNCTION IF EXISTS public.pa_is_valid_gtin(text);
DROP FUNCTION IF EXISTS public.pa_gtin_check_digit(text);
```

Nenhuma linha é tocada por esta migration, então o rollback é completo: não existe dado
criado por ela que se perca.

---

## FASE 5 — Backfill

**Este é o ponto sem volta.** A partir daqui o rollback de R2-A deixa de ser reversível de
verdade: derrubar as colunas passa a apagar curadoria humana.

- [ ] escrever **como `service_role`** (ver fato 1 no topo)
- [ ] somente as linhas aprovadas na FASE 2
- [ ] em lotes pequenos, cada lote dentro de uma transação
- [ ] `quantity_value` é o **total** da embalagem (ver fato 2 no topo)
- [ ] relatório de contagem antes e depois de cada lote, arquivado
- [ ] nenhum valor ambíguo escrito — na dúvida, a linha fica `NULL`
- [ ] nenhuma alteração silenciosa: toda linha escrita tem uma decisão registrada

Se um lote falhar por `unique_violation`, é o índice de identidade exata dizendo que duas
linhas aprovadas colidem. **Não contornar.** Voltar à FASE 2 para aquelas duas linhas — a
consulta 6 do script de prontidão lista exatamente esses casos.

---

## FASE 6 — `VALIDATE CONSTRAINT`

Só depois de o backfill estar completo e auditado. Uma a uma, para saber qual falhou:

```sql
ALTER TABLE public.products VALIDATE CONSTRAINT products_package_type_check;
ALTER TABLE public.products VALIDATE CONSTRAINT products_quantity_unit_check;
ALTER TABLE public.products VALIDATE CONSTRAINT products_quantity_value_positive;
ALTER TABLE public.products VALIDATE CONSTRAINT products_units_per_package_positive;
ALTER TABLE public.products VALIDATE CONSTRAINT products_quantity_pair_complete;
ALTER TABLE public.products VALIDATE CONSTRAINT products_gtin_valid;
```

**Falha aqui bloqueia o avanço, e falhar aqui é o comportamento desejado.** É o banco
recusando a afirmação "todo dado existente obedece à regra" quando ela não é verdade. A
resposta é olhar a linha, não afrouxar a constraint.

**`NOT NULL` não entra nesta fase.** Tornar os campos obrigatórios exige cobertura
suficiente do backfill, é outra migration, e tem gate próprio.

---

## FASE 7 — Observabilidade e aceite

- [ ] contagens conferidas contra o registro da FASE 5
- [ ] nenhum erro novo no Worker nem no banco
- [ ] **busca** funciona como antes (o índice textual continua existindo, de propósito)
- [ ] **comparação** funciona como antes
- [ ] **ranking inalterado** — R2 não toca em ordenação, e qualquer mudança aqui é defeito
- [ ] **nenhuma mudança visual** — R2 não tem superfície de interface
- [ ] rollback ainda disponível e documentado para o estado atual
- [ ] cards MVP-E1-01, E1-02, E1-05 e E1-08 atualizados com a evidência

---

## O que este runbook proíbe

- aplicar as duas migrations no mesmo passo sem verificar a primeira
- fazer backfill antes da revisão linha a linha
- promover `parsed` a `confirmed` automaticamente
- validar constraint antes do backfill
- corrigir ou inventar GTIN
- afrouxar constraint para o `VALIDATE` passar
- executar qualquer passo em produção sem ter executado em staging antes
