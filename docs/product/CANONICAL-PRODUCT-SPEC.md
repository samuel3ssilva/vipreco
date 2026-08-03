# Produto exato — especificação de identidade

**Status: NORMATIVO** para o épico E1. Complementa
[`../data/MVP-DATA-CONTRACT.md`](../data/MVP-DATA-CONTRACT.md) (campos) e
[`../data/PRODUCT-IDENTIFIERS.md`](../data/PRODUCT-IDENTIFIERS.md) (GTIN e identificadores).

**Nada aqui está implementado.** Nenhuma migration foi criada. Este documento descreve o alvo.

---

## 1. O registro comparável é um SKU exato

Um registro de produto representa **um SKU exato**: o item que está na prateleira, com aquela marca,
aquela variante, aquela embalagem e aquela quantidade. Não uma família, não uma categoria, não uma
aproximação.

### Por que não existe camada de "produto canônico" separada

O REBASELINE ASSESSMENT propôs uma tabela `canonical_products` com `products` apontando para ela.
O mandato R0.5 §5 é explícito em sentido contrário:

> Não criar uma camada abstrata complexa de família de produto como requisito do MVP, salvo
> evidência concreta no assessment de que ela é indispensável.

Não há essa evidência. A comparação chaveia num único `product_id` e continuará chaveando; a família
serviria apenas para agrupar "outro tamanho", que é uma **relação derivável** de marca + variante +
categoria com quantidade diferente. Construir a abstração agora é pagar migration, backfill e risco
por um recurso que ainda não tem forma decidida.

**Consequência prática:** R1 fica muito menor do que o assessment previa — estruturar `products` como
SKU exato, sem tabela nova e sem backfill de agrupamento. A família fica registrada como evolução
futura em [`../pmo/MVP-EXECUTION-PLAN.md`](../pmo/MVP-EXECUTION-PLAN.md).

---

## 2. Identidade do SKU

A identidade de um SKU é a tupla:

```
(name, brand, variant, package_type, quantity_value, quantity_unit)
```

normalizada pelo contrato único de [`../data/PRODUCT-IDENTIFIERS.md`](../data/PRODUCT-IDENTIFIERS.md).

Hoje a identidade é `(name, brand, variant, size_text)` normalizada — garantida pelo índice
`products_canonical_identity_idx`. A mudança de E1 é substituir `size_text` (texto livre) por
quantidade e unidade estruturadas, mais `package_type`.

`primary_gtin`, quando presente, é **atalho suficiente** de identidade: dois registros com o mesmo
GTIN são o mesmo SKU. Mas GTIN não é a única prova, e a ausência dele não impede a identidade — ver
§3 do documento de identificadores.

---

## 3. As três relações

Só uma delas entra na comparação.

### EXATO

Mesma tupla de identidade. Diferença permitida: nenhuma.

**É o único conjunto que entra na lista orgânica de comparação.** É esta relação que o produto
promete, e é por ela que ele existe.

### OUTRO TAMANHO

Mesmo `name`, `brand`, `variant` e `package_type`; `normalized_quantity` diferente.

- registro separado no banco;
- **não participa da mesma comparação**;
- aparece em seção própria, rotulada;
- a **única** comparação numérica permitida ali é por preço unitário;
- pode ser relacionado por família futura — hoje é derivado por consulta.

### SIMILAR

Marca, variante, composição ou embalagem diferentes, dentro da mesma categoria.

- registro separado;
- **nunca entra na comparação exata, em nenhuma fase** — é proibição, não adiamento;
- a interface **deve** rotular explicitamente;
- nenhuma comparação numérica implícita: sem "mais barato que", sem diferença calculada, sem ordem
  por preço junto com os exatos.

---

## 4. As seis ambiguidades — resolvidas

Decisões registradas em [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md), D6.

### 4.1 Marca própria de redes diferentes → SIMILAR

"Arroz Tipo 1 5 kg" da rede A e da rede B têm marcas diferentes. São produtos diferentes, com
origem, qualidade e preço próprios. Tratá-los como o mesmo item deixaria a comparação mais rica e
menos verdadeira — princípio 1 decide contra.

### 4.2 Variante que muda o produto → SIMILAR

Café tradicional e café extraforte são o mesmo grão em torras diferentes, e a pessoa que compra um
não aceita o outro. `variant` é campo de identidade; valores diferentes produzem SKUs diferentes.

Vale igual para: integral × desnatado, neutro × perfumado, com açúcar × zero.

### 4.3 Peso variável e granel → fora do escopo comparável do MVP

Carne, frios e hortifrúti vendidos por quilo não têm `quantity_value` de embalagem. Sem quantidade
estruturada não há SKU exato (princípio 1) e não há preço unitário confiável (princípio 3).

**Decisão:** não entram como produto comparável no MVP. Não é proibição permanente — é reconhecimento
de que o modelo de dados do MVP não os representa. Reabrir exige campo próprio de referência
declarada pelo mercado e decisão do PMO.

### 4.4 Pack × unidade → OUTRO TAMANHO

Papel higiênico "12 rolos" e "4 rolos" são o mesmo produto em quantidades diferentes:
`package_type = pack`, `quantity_unit = un`, `quantity_value` diferente. Comparáveis apenas por preço
por rolo, na seção "outro tamanho".

### 4.5 Reformulação silenciosa → a quantidade vence o GTIN

Um óleo que era 1 L passa a ser 900 ml mantendo o mesmo código de barras. Se o GTIN mandasse, o
produto apresentaria 900 ml e 1 L como o mesmo item e a comparação ficaria falsa exatamente no ponto
em que o consumidor mais precisa dela.

**Regra:** quantidade e unidade prevalecem. Quando o mesmo `primary_gtin` aparecer em duas
quantidades diferentes, são **dois SKUs**, e o GTIN deixa de ser identificador único desses dois —
o índice único de GTIN precisa acomodar esse caso (ver `PRODUCT-IDENTIFIERS.md` §4).

### 4.6 Embalagem → SIMILAR

Extrato de tomate em vidro, sachê e lata, com o mesmo conteúdo, não são o mesmo item de prateleira:
preço, conservação e uso diferem. `package_type` é campo de identidade, e valores diferentes
produzem SKUs que não se comparam diretamente.

---

## 5. Aliases de busca

Aliases resolvem a distância entre como o produto se chama e como a pessoa o chama: "coca" para
"Coca-Cola", "detergente ypê" para "Detergente Ypê Neutro", "papel hig" para "Papel Higiênico".

- alias é **entrada de busca**, nunca de identidade: dois SKUs podem compartilhar um alias sem virar
  o mesmo produto;
- alias é **curado**, nunca inferido automaticamente;
- alias entra no texto de busca normalizado pelo mesmo contrato do `PRODUCT-IDENTIFIERS.md`;
- alias **não** aparece na interface como nome do produto.

---

## 6. Estado do registro

`is_active` e `is_demo` permanecem como estão.

`is_demo` continua sendo sinal defensivo e **não** é o mecanismo de separação entre demonstração e
piloto — essa separação é por adapter e por ambiente (D9). Nenhuma consulta nova deve passar a
depender de `is_demo` como filtro de negócio.

---

## 7. O que esta especificação não decide

- a **rota** da tela de comparação (P-03);
- a **janela** de seleção do preço anterior (P-01);
- se e quando a camada de família será construída.
