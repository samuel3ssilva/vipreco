# Contrato de dados do MVP

**Status: NORMATIVO** para E1 e E2. **Nada aqui está implementado.** Nenhuma migration foi criada
por este documento — ele descreve o alvo, e aplicar qualquer parte dele exige gate humano
(princípio 10).

Onde este documento diz "campo", leia "campo ou entidade equivalente": a forma final (coluna, tabela
associada, tipo composto) é decisão de R1/R2. O que está fixado aqui é **o dado que precisa existir**
e **a regra que o governa**.

---

## 1. Produto exato

| Campo                 | Tipo                                                          | Obrigatório | Regra                                                                   |
| --------------------- | ------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `product_id`          | uuid                                                          | sim         | chave de comparação. **Nada no código pode assumir que GTIN é a chave** |
| `name`                | text                                                          | sim         | nome do produto, sem marca e sem tamanho embutidos                      |
| `brand`               | text                                                          | não         | campo de identidade; ausência é estado normal                           |
| `variant`             | text                                                          | não         | campo de identidade (tradicional, integral, neutro…)                    |
| `package_type`        | enum `unidade, pack, kit, garrafa, lata, vidro, sache, caixa` | sim         | campo de identidade — ver `../product/CANONICAL-PRODUCT-SPEC.md` §4.6   |
| `quantity_value`      | numeric(12,4) > 0                                             | sim         | quantidade **declarada na embalagem**                                   |
| `quantity_unit`       | enum `g, kg, ml, l, un`                                       | sim         | unidade declarada                                                       |
| `normalized_quantity` | numeric(12,4)                                                 | derivado    | ver §2                                                                  |
| `normalized_unit`     | enum `g, ml, un`                                              | derivado    | ver §2                                                                  |
| `category`            | text                                                          | não         | agrupamento editorial; **não** é identidade                             |
| `primary_gtin`        | text                                                          | não         | ver [`PRODUCT-IDENTIFIERS.md`](PRODUCT-IDENTIFIERS.md)                  |
| `search_aliases`      | lista de text                                                 | não         | entrada de busca, nunca identidade                                      |
| `is_active`           | boolean                                                       | sim         | inalterado                                                              |
| `is_demo`             | boolean                                                       | sim         | sinal defensivo; **não** é o mecanismo de separação (D9)                |
| imagem (7 campos)     | —                                                             | não         | ver [`IMAGE-POLICY.md`](IMAGE-POLICY.md)                                |

`size_text` permanece durante a transição como **texto de exibição**, nunca como fonte de cálculo.

---

## 2. Quantidade e conversão

### Unidades aceitas

| Unidade | Grandeza | Normaliza para    |
| ------- | -------- | ----------------- |
| `g`     | massa    | `g` (fator 1)     |
| `kg`    | massa    | `g` (fator 1000)  |
| `ml`    | volume   | `ml` (fator 1)    |
| `l`     | volume   | `ml` (fator 1000) |
| `un`    | contagem | `un` (fator 1)    |

Cinco unidades, três grandezas. Nada além disso entra no MVP.

```
normalized_quantity = quantity_value × fator(quantity_unit)
normalized_unit     = grandeza(quantity_unit)
```

### Base de cálculo do preço unitário

| `normalized_unit` | `unit_price_basis` | Fórmula                              |
| ----------------- | ------------------ | ------------------------------------ |
| `g`               | `per_kg`           | `price ÷ normalized_quantity × 1000` |
| `ml`              | `per_l`            | `price ÷ normalized_quantity × 1000` |
| `un`              | `per_un`           | `price ÷ normalized_quantity`        |

O preço unitário é **calculado, nunca armazenado**. Armazenar cria a chance de ele envelhecer em
relação ao preço, e um preço unitário desatualizado é pior do que nenhum.

### `calculation_status`

| Valor         | Quando                                                                                                               | Efeito na interface      |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `ok`          | quantidade e unidade estruturadas **e aprovadas**                                                                    | preço unitário é exibido |
| `ambiguous`   | há quantidade, mas a base é discutível (kit heterogêneo, promoção que muda o preço efetivo sem quantidade explícita) | **nada é exibido**       |
| `unavailable` | não há quantidade estruturada (peso variável, dado ainda não migrado)                                                | **nada é exibido**       |

**Regra central, do mandato §6:** preço unitário só aparece quando quantidade e unidade estiverem
estruturadas e aprovadas. Fora de `ok`, ausência — e ausência é estado normal, tratada como o
`AchadoCard` já trata `valid_until` e `previous_price`.

**Nenhuma inferência de quantidade a partir de texto em tempo de apresentação.** Ler `"500 g"` de
uma string e converter na hora de desenhar a tela é exatamente o que o princípio 3 proíbe.

### Casos, um a um

| Caso                                                        | Como é representado                                      | `calculation_status` | Base                      |
| ----------------------------------------------------------- | -------------------------------------------------------- | -------------------- | ------------------------- |
| **Unidade simples** — "Café 500 g"                          | `500` `g`, `package_type unidade`                        | `ok`                 | `per_kg`                  |
| **Volume** — "Óleo 900 ml"                                  | `900` `ml`, `unidade`                                    | `ok`                 | `per_l`                   |
| **Pack homogêneo** — "Papel higiênico 12 rolos"             | `12` `un`, `pack`                                        | `ok`                 | `per_un` (preço por rolo) |
| **Dúzia** — "Ovos, dúzia"                                   | `12` `un`, `pack`                                        | `ok`                 | `per_un`                  |
| **Rolos**                                                   | idem pack                                                | `ok`                 | `per_un`                  |
| **Cápsulas** — "Café em cápsulas, 10 un"                    | `10` `un`, `pack`                                        | `ok`                 | `per_un`                  |
| **Pack com massa por item** — "6 × 350 ml"                  | `2100` `ml`, `pack`, mais `units_per_package = 6`        | `ok`                 | `per_l` **e** `per_un`    |
| **Kit heterogêneo** — "cesta com 5 itens diferentes"        | quantidade não representável                             | `ambiguous`          | nenhuma                   |
| **Peso variável / granel**                                  | **fora do escopo comparável do MVP**                     | `unavailable`        | nenhuma                   |
| **Unidade não conversível** — "1 conjunto", "tamanho único" | `1` `un` só se for de fato contável; senão `unavailable` | conforme             | `per_un` ou nenhuma       |

Para packs, `units_per_package` (inteiro > 0) permite as duas bases ao mesmo tempo — por litro e por
unidade — e as duas são úteis: refrigerante em pack se compara por litro entre marcas e por lata na
gôndola.

### Regras que impedem cálculo errado

1. Preço unitário nunca é exibido fora de `calculation_status = ok`.
2. Preço unitário nunca compara grandezas diferentes: `per_kg` só contra `per_kg`.
3. Preço unitário é **secundário**. A lista orgânica continua ordenada por preço absoluto entre
   produtos EXATOS. O unitário é o critério da seção "outro tamanho", onde é a única comparação
   justa possível.
4. Quando uma promoção estruturada altera o preço efetivo, o unitário do preço efetivo só é exibido
   se a quantidade da condição for explícita; senão, `ambiguous`.
5. Arredondamento de exibição: duas casas decimais, arredondamento comercial. O cálculo interno
   usa a precisão cheia; só a exibição arredonda.

---

## 3. Oferta

`prices` mantém a chave (`product_id`, `market_id`, `price`, `source_type`, `observed_at`,
`valid_until`) e ganha:

| Campo               | Tipo        | Regra                                                              |
| ------------------- | ----------- | ------------------------------------------------------------------ |
| `offer_state`       | enum        | ver [`OFFER-STATES.md`](OFFER-STATES.md)                           |
| `promotion_type`    | enum, nulo  | ver [`PROMOTION-TYPES.md`](PROMOTION-TYPES.md)                     |
| `promotion_params`  | jsonb, nulo | validado por tipo                                                  |
| `special_condition` | text        | **preservado** — texto original para o que ainda não é tipificável |

`special_condition` **não pode ser base de nenhuma regra computável**. Ele é observação para leitura
humana, e continua sendo exibido como já é hoje.

---

## 4. Mercado

`markets` não muda de forma. Muda o que o contrato de domínio expõe:

| Campo                                 | Estado                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `city`                                | **passa a integrar o contrato de identidade de mercado** (D12, TD-003). A coluna já existe com `NOT NULL DEFAULT 'Artemis'` e índice próprio; falta apenas ser lida |
| `neighborhood`, `address`, `maps_url` | inalterados                                                                                                                                                         |

---

## 5. Contrato de domínio único (D1)

Uma interface, dois adapters. O tipo de domínio é o mesmo dos dois lados — princípio 9.

```
CatalogPort
 ├── searchProducts(term, limit)          → Product[]
 ├── getProductComparison(productId)      → ProductComparison
 ├── getProductsPriceStats(productIds)    → Record<id, ProductPriceStats>
 ├── getMarkets()                         → Market[]
 └── getFeaturedOpportunities(limit)      → Opportunity[]

 ├── FixtureCatalogAdapter   (DEMO)     — dados versionados, sem rede, SSR completo
 └── SupabaseCatalogAdapter  (PILOTO)   — leitura server-side quando necessário
```

Regras:

- **nenhum componente consulta dados diretamente.** `services/catalog.ts` já é essa fronteira e
  continua sendo;
- o adapter é escolhido uma vez, por `appMode()`, no ponto de composição — nunca dentro de um
  componente;
- o fixture obedece ao mesmo contrato: se um campo é obrigatório no domínio, o fixture o traz;
- em DEMO, o caminho do Supabase **não é avaliado** — a garantia atual (`import()` dinâmico, coberta
  por `index.demo-source.test.ts`) é preservada.

**A Home não é alterada nesta rodada.** A migração acontece em R4.

---

## 6. O que este contrato não decide

- forma final das tabelas (coluna × tabela associada) — R1/R2;
- unicidade de GTIN sob reformulação — `PRODUCT-IDENTIFIERS.md` §4;
- janela do preço anterior — P-01;
- tecnologia de armazenamento de eventos — P-02.
