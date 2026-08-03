# Identificadores de produto — GTIN e normalização

**Status: NORMATIVO** para E1. Este documento define o contrato de normalização que **precisa ser
idêntico** em TypeScript e em SQL, e as regras de GTIN.

O PR técnico B desta rodada (`fix/product-normalization-contract`) implementa o contrato de
normalização descrito em §2. As regras de GTIN de §3 e §4 ainda **não** estão implementadas.

---

## 1. O problema que este documento resolve

Existem hoje duas normalizações, e elas divergem:

|                          | `normalizeSearchText()` (TypeScript) | `pa_normalize_text()` (SQL)       |
| ------------------------ | ------------------------------------ | --------------------------------- |
| minúsculas               | sim                                  | sim                               |
| remove acento            | sim (NFD + faixa combinante)         | sim (`translate` com tabela fixa) |
| colapsa espaço repetido  | **sim**                              | **não**                           |
| remove espaço nas pontas | **sim**                              | **não**                           |

A divergência tem duas consequências, e a segunda é séria:

1. um termo digitado com espaço duplo é colapsado no cliente e não encontra um `search_text` gravado
   com espaço duplo;
2. o índice `products_canonical_identity_idx` considera `"500 g"`, `"500  g"` e `"500g"` **três
   identidades distintas** — três produtos aceitos pelo banco, e a comparação partida em três sem
   nenhum erro visível.

O segundo caso é o risco real: numa operação manual por WhatsApp, a mesma oferta digitada duas vezes
com espaçamento diferente cria um SKU novo em silêncio.

---

## 2. Contrato único de normalização

Uma única definição, aplicada igualmente nos dois lados.

```
normalizar(texto):
  1. se nulo → string vazia
  2. minúsculas
  3. remover diacríticos (á→a, ç→c, ñ→n, …)
  4. substituir qualquer sequência de espaço em branco por um único espaço
  5. remover espaço das pontas
```

**O que o contrato NÃO faz — e por que:**

- **não** remove o espaço entre número e unidade. `"500g"` e `"500 g"` continuam textos diferentes.
  Colapsar os dois exigiria interpretar o texto para descobrir onde termina o número e começa a
  unidade, e o princípio 3 ("dado estruturado antes de interpretação de texto") decide contra.
  A resposta certa para `"500g"` × `"500 g"` é `quantity_value = 500` + `quantity_unit = 'g'`, que é
  E1 — não um truque de string.
- **não** remove pontuação, hífen ou símbolo. Marcas contêm hífen ("Coca-Cola") e removê-lo mudaria
  a identidade.
- **não** toca em dígitos. GTIN passa intacto, com zeros à esquerda preservados.

### Vetores de teste obrigatórios

Os mesmos vetores rodam nos dois lados. Divergência é falha de teste.

| Entrada                   | Saída esperada      | O que prova                                                     |
| ------------------------- | ------------------- | --------------------------------------------------------------- |
| `"500 g"`                 | `"500 g"`           | caso base                                                       |
| `"500  g"` (dois espaços) | `"500 g"`           | espaço repetido colapsa                                         |
| `"500g"`                  | `"500g"`            | **continua diferente de `"500 g"`** — o contrato não interpreta |
| `"1 L"`                   | `"1 l"`             | caixa                                                           |
| `"1L"`                    | `"1l"`              | continua diferente de `"1 l"`                                   |
| `"  Café  "`              | `"café"` → `"cafe"` | pontas + acento                                                 |
| `"CAFÉ PILÃO"`            | `"cafe pilao"`      | caixa + acento                                                  |
| `"Ypê"`                   | `"ype"`             | acento raro                                                     |
| `"7896006711117"`         | `"7896006711117"`   | GTIN intacto                                                    |
| `"07896006711117"`        | `"07896006711117"`  | **zero à esquerda preservado**                                  |
| `"\t\ncafé\t"`            | `"cafe"`            | tabulação e quebra de linha contam como espaço                  |

---

## 3. GTIN

- **texto**, sempre. Nunca numérico — zeros à esquerda são parte do código.
- **opcional.** Produto sem GTIN é produto normal, não produto incompleto.
- **validado** quando presente: só dígitos, comprimento em {8, 12, 13, 14}, dígito verificador
  correto pelo algoritmo GS1.
- **não é a única prova de identidade.** Um SKU sem GTIN é identificado pela tupla de
  `CANONICAL-PRODUCT-SPEC.md` §2; um SKU com GTIN reformulado (§4.5 daquele documento) é identificado
  pela quantidade.

### Múltiplos identificadores no futuro

O campo se chama `primary_gtin` de propósito. O desenho deve aceitar, sem migration destrutiva, que
um SKU tenha mais de um identificador — GTIN antigo e novo após reformulação, EAN e DUN de pack,
código interno de rede. A forma provável é uma tabela `product_identifiers`
(`product_id`, `scheme`, `value`, `is_primary`), e ela **não** faz parte do MVP.

O que o MVP precisa garantir é apenas isto: **nada no código deve assumir que GTIN é a chave de
produto.** A chave é `product_id`.

---

## 4. Unicidade

Hoje: `products_gtin_unique_idx` — único sobre `gtin`, parcial (`WHERE gtin IS NOT NULL`).

O caso de reformulação silenciosa (mesmo GTIN, quantidade diferente) **quebra** essa unicidade: são
dois SKUs legítimos com o mesmo código. Duas saídas possíveis, ambas registradas aqui e **nenhuma
implementada**:

- **(a)** ampliar o índice para `(gtin, normalized_quantity, normalized_unit)` — mantém unicidade
  útil e admite o caso real;
- **(b)** mover a unicidade para `product_identifiers` com `is_primary`, resolvendo o caso por
  modelagem.

A escolha pertence a R1, junto com o desenho de quantidade. **Não é decidida aqui.**

---

## 5. Colisões existentes

O PR técnico B entrega um **script read-only** (`scripts/normalization-collisions.ts`) que, dado um
conjunto de linhas de `products`, reporta grupos que passariam a colidir sob o contrato de §2.

Regras do script:

- **somente leitura.** Não escreve, não altera, não apaga;
- **não une produtos.** Colisão é relatório para decisão humana, nunca ação automática;
- roda contra o seed fictício versionado sem precisar de rede.

**Se o relatório apontar colisão real em dado de qualquer ambiente, a ação é `HUMAN ACTION
REQUIRED`** — unir ou excluir produto é decisão do Founder/PMO, nunca do CTO.

---

## 6. Migration corretiva

O PR técnico B cria a migration que alinha `pa_normalize_text()` ao contrato. Ela:

- é **aditiva em comportamento**: `CREATE OR REPLACE FUNCTION`, sem `DROP`;
- **não** apaga, une ou altera nenhuma linha;
- **não foi aplicada** em nenhum ambiente. Aplicar é gate humano (princípio 10);
- traz o rollback exato em comentário, no mesmo padrão de
  `20260729223000_close_public_write_surfaces.sql`.

### O ponto de atenção da aplicação

`products_canonical_identity_idx` é um índice **funcional** sobre `pa_normalize_text(...)`. Trocar a
função exige reconstruir o índice, e a reconstrução **falha** se existirem linhas que só eram
distintas pelo espaçamento. Isso é proteção, não defeito: o banco recusa a mudança em vez de aceitar
uma união silenciosa.

Por isso a ordem de aplicação, quando o gate autorizar, é:

1. rodar o script de colisões e obter relatório vazio;
2. se não estiver vazio, parar e devolver a decisão ao Founder/PMO;
3. só então aplicar a migration, com o índice recriado no mesmo passo.
