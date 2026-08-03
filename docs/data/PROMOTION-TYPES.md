# Promoções tipificadas

**Status: NORMATIVO** para E2.7. **Nada aqui está implementado.**

Hoje toda condição vive em `prices.special_condition`, texto livre, exibido literalmente. Exemplos
reais do seed fictício: `"Limite de 2 unidades por cliente"`, `"Oferta válida enquanto durar o
estoque"`, `"Máximo de 6 unidades"`, `"Preço válido para pagamento à vista"`.

Texto livre não calcula, não valida e não se compara. Mas nem toda condição cabe em estrutura — por
isso o campo de texto **permanece**, ao lado dos tipos, e nunca é base de regra computável.

---

## 1. Os quatro tipos

Representados por `promotion_type` (enum, nulo quando não há promoção) e `promotion_params` (jsonb,
validado por tipo).

---

### `unit_limit` — limite por cliente

|                               |                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Parâmetros**                | `max_units` (inteiro, 1–99)                                                     |
| **Validação**                 | inteiro positivo; `max_units = 1` é válido e comum                              |
| **Texto exibido**             | "limite de {max_units} por cliente"                                             |
| **Preço efetivo**             | **não muda.** É restrição de quantidade, não desconto                           |
| **Casos inválidos**           | zero, negativo, fracionário, ausente                                            |
| **Exemplo sintético**         | Arroz 5 kg, R$ 26,49, `{"max_units": 2}` → "R$ 26,49 · limite de 2 por cliente" |
| **Impacto no preço unitário** | nenhum                                                                          |
| **Risco**                     | confundir limite com desconto. O selo nunca usa cor ou peso de "oferta"         |

---

### `buy_x_pay_y` — leve X, pague Y

|                               |                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parâmetros**                | `buy` (inteiro > `pay`), `pay` (inteiro > 0)                                                                                                    |
| **Validação**                 | ambos inteiros; `buy > pay`; `buy ≤ 24`                                                                                                         |
| **Texto exibido**             | "leve {buy}, pague {pay}"                                                                                                                       |
| **Preço efetivo**             | `price × pay ÷ buy`, **por unidade, ao levar `buy` unidades**                                                                                   |
| **Casos inválidos**           | `buy ≤ pay`; qualquer fracionário                                                                                                               |
| **Exemplo sintético**         | Detergente R$ 2,79, `{"buy": 3, "pay": 2}` → "R$ 2,79 · leve 3, pague 2 — sai a R$ 1,86 a unidade levando 3"                                    |
| **Impacto no preço unitário** | o unitário do preço efetivo pode ser exibido **junto da quantidade que o produz**. O unitário do preço de prateleira continua sendo o principal |
| **Risco**                     | anunciar o efetivo como se fosse o de prateleira                                                                                                |

---

### `second_unit_discount` — desconto na segunda unidade

|                               |                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Parâmetros**                | `discount_percent` (inteiro, 1–100)                                                                      |
| **Validação**                 | inteiro; 100 equivale a `buy_x_pay_y {buy:2, pay:1}` e deve ser normalizado para esse tipo               |
| **Texto exibido**             | "2ª unidade com {discount_percent}% de desconto"                                                         |
| **Preço efetivo**             | média de duas unidades: `price × (2 − discount_percent÷100) ÷ 2`                                         |
| **Casos inválidos**           | zero, negativo, acima de 100, fracionário                                                                |
| **Exemplo sintético**         | Café R$ 17,49, `{"discount_percent": 50}` → "R$ 17,49 · 2ª com 50% — sai a R$ 13,12 a unidade levando 2" |
| **Impacto no preço unitário** | igual ao anterior: só com a quantidade explícita                                                         |
| **Risco**                     | comparar a média de duas unidades com o preço cheio de outro mercado                                     |

---

### `quantity_price` — preço a partir de quantidade

|                               |                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Parâmetros**                | `min_quantity` (inteiro > 1), `promo_price` (numeric > 0)                                                  |
| **Validação**                 | `promo_price < price`; `min_quantity ≥ 2`                                                                  |
| **Texto exibido**             | "a partir de {min_quantity} unidades: {promo_price}"                                                       |
| **Preço efetivo**             | `promo_price`, **a partir de** `min_quantity`                                                              |
| **Casos inválidos**           | `promo_price ≥ price`; `min_quantity ≤ 1`                                                                  |
| **Exemplo sintético**         | Leite R$ 5,29, `{"min_quantity": 6, "promo_price": 4.89}` → "R$ 5,29 · a partir de 6 un: R$ 4,89 cada"     |
| **Impacto no preço unitário** | duas leituras possíveis; **exibir só a do preço de prateleira**, com o efetivo escrito ao lado da condição |
| **Risco**                     | ordenar a lista pelo preço promocional                                                                     |

---

## 2. Ranking

Três regras, e a primeira é inviolável.

**1. Promoção condicional não altera silenciosamente a ordem principal.** A lista orgânica é
ordenada pelo `price` de prateleira. Ordenar pelo efetivo faria a comparação depender de quantas
unidades a pessoa vai levar — informação que ninguém tem — e transformaria promoção em posição,
exatamente o que o princípio inviolável #4 do `CLAUDE.md` proíbe.

**2. O preço efetivo pode ser exibido, sempre com a condição que o produz.** Nunca sozinho, nunca
como número principal do card, nunca sem a quantidade.

**3. Nenhum cálculo é apresentado sem quantidade e regra explícitas.** Se a condição não diz quantas
unidades, não há efetivo a mostrar — só o texto.

---

## 3. Texto original preservado

`special_condition` continua existindo e continua sendo exibido, como já é hoje.

- serve para o que ainda não é tipificável: "válido para pagamento à vista", "somente na loja
  física", "enquanto durar o estoque";
- **nenhuma regra computável depende dele.** Não é lido por parser, não vira preço efetivo, não
  entra em ordenação, não influencia `calculation_status`;
- quando uma condição recorrente aparecer com frequência suficiente, ela vira tipo novo por decisão
  do PMO — não por heurística de texto.

---

## 4. Validação

Toda validação é **server-side**, no momento da publicação. `promotion_params` fora do formato do
seu `promotion_type` é rejeitado na escrita, nunca "tolerado" na leitura.

A interface trata `promotion_params` inválido como ausência de promoção — nunca tenta adivinhar a
intenção.

---

## 5. Interação com preço unitário

O preço unitário exibido no card é sempre o do **preço de prateleira**
([`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §2). O unitário do preço efetivo, quando exibido,
aparece dentro da linha da condição, com a quantidade escrita.

Quando o tipo de promoção não permite derivar quantidade explícita, `calculation_status` do efetivo é
`ambiguous` e nada é exibido.

---

## 6. O que este documento não cobre

**Tipo de preço, canal e condição de acesso** — preço de clube, preço com cartão, preço online
contra loja física, preço de atacado, exigência de identificação no caixa. É dimensão
**ortogonal** a esta: um preço de clube sem promoção existe, e uma promoção no canal online
existe.

Está registrada, **fora do MVP**, em
[`PRICE-CONDITION-TAXONOMY.md`](PRICE-CONDITION-TAXONOMY.md). Os quatro tipos deste documento
continuam normativos para E2.7 e não são afetados por ela.
