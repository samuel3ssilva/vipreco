# Aliases de produto por fonte

**Status: NORMATIVO como registro de contrato. NÃO É ESCOPO DO MVP.**

> **Nada aqui está implementado e nada aqui autoriza implementação.** Nenhuma tabela, nenhuma
> coluna, nenhuma migration, nenhum conector. Este documento descreve o dado que precisará
> existir **se e quando** o Gate PM-DATA-0 aprovar a trilha de ingestão automática
> ([`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md)).
>
> Nenhuma fonte externa foi acessada para escrever este documento.

---

## 1. Por que este documento existe separado

O projeto já tem **um** conceito de alias, e ele é outro.

|                            | Alias de busca                                                                                                                                            | Alias de fonte                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Onde vive**              | [`../product/CANONICAL-PRODUCT-SPEC.md`](../product/CANONICAL-PRODUCT-SPEC.md) §5 · `search_aliases` em [`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §1 | **este documento**                                                    |
| **Resolve**                | como a **pessoa** chama o produto ("coca", "papel hig")                                                                                                   | como a **fonte externa** nomeia o produto                             |
| **Relação com identidade** | **nunca** é identidade — dois SKUs podem compartilhar um alias                                                                                            | **é** vínculo de identidade — liga um item de fonte a um `product_id` |
| **Escopo**                 | global no catálogo                                                                                                                                        | específico da fonte e, quando necessário, da loja                     |
| **Fase**                   | MVP · E1                                                                                                                                                  | **pós-MVP**                                                           |

São opostos no ponto que mais importa: um alias de busca que erra devolve um resultado a mais
na lista; um alias de fonte que erra **publica o preço do produto errado**. Tratá-los no mesmo
lugar convidaria a aplicar a regra de um ao outro.

A necessidade já estava declarada:
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md) §4
registra que **"aliases por fonte é a única dependência que o MVP não cobre sozinho"**. Este
documento é essa extensão.

Ele **não** vive em [`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) de propósito: aquele
documento é o contrato do MVP e serve de base para as migrations de R1/R2. Uma entidade
pós-MVP escrita ali entraria em migration do MVP por acidente — exatamente o risco que a trilha
existe para evitar.

---

## 2. O registro de alias

Um alias de fonte é a afirmação: _"o item X da fonte Y é o SKU Z do nosso catálogo"_. Onde este
documento diz "campo", leia "campo ou estrutura equivalente" — a forma final é decisão do
contrato de conector (PM-DATA-04), não deste documento.

### Identificação da origem

| Campo                  | Obrigatório | Regra                                                                                                     |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `source`               | sim         | qual fonte. Um alias **nunca** vale para outra fonte, mesmo que a descrição seja idêntica                 |
| `source_store_id`      | condicional | obrigatório quando a fonte pratica catálogo ou preço por loja; nulo só quando comprovadamente irrelevante |
| `source_sku`           | não         | código do item na fonte. **Texto**, sempre — zeros à esquerda são parte do código                         |
| `source_gtin`          | não         | GTIN **como a fonte publica**, sem correção nossa. Ver §5                                                 |
| `original_description` | sim         | a descrição literal da fonte, preservada sem edição. É o que permite auditar a decisão depois             |

`original_description` é preservada **exatamente** como veio. Normalizar, corrigir ou "limpar"
a descrição destrói a única prova de que o vínculo fazia sentido no momento em que foi feito.

### O vínculo

| Campo                  | Obrigatório | Regra                                                                            |
| ---------------------- | ----------- | -------------------------------------------------------------------------------- |
| `canonical_product_id` | condicional | o `product_id` do catálogo. Nulo enquanto `status` for `proposed` ou `rejected`  |
| `matching_method`      | sim         | **qual** dos seis níveis de §3 produziu a proposta                               |
| `confirmation_method`  | condicional | como foi confirmado; obrigatório para `confirmed`                                |
| `confirmed_by`         | condicional | identificação **operacional** de quem confirmou — papel ou identificador interno |
| `confirmed_at`         | condicional | instante da confirmação                                                          |

`confirmed_by` é identificação operacional, **nunca** dado pessoal: não guarda nome completo,
e-mail, telefone nem documento. Quem confirmou precisa ser rastreável para auditoria interna,
e isso se resolve com um identificador de operador — não com a identidade civil de ninguém.

### Observação e ciclo

| Campo               | Regra                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| `observation_count` | quantas vezes o item foi visto na fonte. **Não é evidência de correção** — ver §4 |
| `last_observed_at`  | última vez que o item foi visto                                                   |
| `status`            | um dos cinco estados de §4                                                        |
| `rejection_reason`  | obrigatório quando `status = rejected`; texto curto, para leitura humana          |
| `notes`             | observação operacional livre, **sem dado pessoal** e sem credencial               |

`notes` segue a mesma regra de `special_condition` em
[`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §3: é texto para leitura humana e **nenhuma
regra computável depende dele**. Nada de parser, nada de heurística, nada de decisão automática
lendo `notes`.

---

## 3. Ordem de matching

**A ordem de precedência é normativa em
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md) §5
e não é repetida aqui.** Seis níveis, em confiança decrescente: GTIN estruturado confiável, SKU
da fonte previamente confirmado, alias humano confirmado, a combinação marca + nome + variante +
quantidade + unidade, similaridade textual **apenas para sugerir**, similaridade visual **apenas
como evidência auxiliar**.

O que este documento acrescenta é o efeito de cada nível **sobre o alias**:

| Nível de `matching_method`                     | `status` inicial possível | Pode ser confirmado automaticamente? |
| ---------------------------------------------- | ------------------------- | ------------------------------------ |
| GTIN em campo estruturado confiável            | `proposed`                | **não** — ver §5                     |
| SKU da fonte previamente confirmado            | `proposed`                | **não**                              |
| alias humano confirmado                        | `confirmed`               | já é confirmação humana              |
| marca + nome + variante + quantidade + unidade | `proposed`                | **não**                              |
| similaridade textual                           | `proposed`                | **não** — só sugere candidato        |
| similaridade visual                            | não cria alias sozinho    | **não** — só reforça sugestão        |

A coluna da direita é sempre "não" por decisão, não por cautela provisória: **nenhum alias de
fonte nasce confirmado sem uma pessoa.** É a regra que separa este documento de um algoritmo de
casamento de catálogo, e ela vale mesmo para GTIN.

Os dois últimos níveis **nunca decidem sozinhos**. Similaridade visual, em particular, não cria
alias: ela só acrescenta evidência a uma proposta que já existe por outro caminho.

---

## 4. Os cinco estados

| Estado         | O que significa                                                                | Alimenta conector?                        |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| `proposed`     | vínculo sugerido, ainda não conferido por pessoa                               | **não**                                   |
| `confirmed`    | uma pessoa conferiu e aprovou                                                  | sim                                       |
| `rejected`     | uma pessoa conferiu e recusou; `rejection_reason` obrigatório                  | **não**, e não é reproposto sem fato novo |
| `deprecated`   | vínculo já foi válido; item saiu do catálogo da fonte ou foi substituído       | **não**                                   |
| `needs_review` | vínculo era `confirmed` e algo mudou o suficiente para exigir nova conferência | **não**, até ser reconfirmado             |

### Transições

```
proposed ──► confirmed        (pessoa)
proposed ──► rejected         (pessoa)
confirmed ──► needs_review    (mudança substancial na descrição da fonte — automático)
confirmed ──► deprecated      (item sumiu do catálogo da fonte)
needs_review ──► confirmed    (pessoa reconfirma)
needs_review ──► rejected     (pessoa recusa)
qualquer ──► deprecated       (operação)
```

**`needs_review` não volta sozinho para `confirmed`.** Um alias rebaixado por mudança de
descrição continua fora até que alguém olhe — mesmo que a descrição volte a ficar parecida com
a anterior.

**`rejected` não é ponto de partida para nova tentativa automática.** Repropor um vínculo
recusado exige fato novo — GTIN que apareceu, SKU que a fonte confirmou —, nunca uma execução
nova do mesmo algoritmo.

### Sobre `observation_count`

Ver o mesmo item quinhentas vezes prova que ele existe na fonte. **Não prova que ele é o nosso
SKU.** `observation_count` serve para priorizar fila de revisão e para detectar item que sumiu;
nunca para promover `proposed` a `confirmed`. Repetição não é evidência.

---

## 5. Regras invioláveis do alias

As regras gerais de matching — `500 g ≠ 1 kg`, `900 ml ≠ 1 L`, `varejo ≠ atacado`, `preço geral
≠ preço de clube`, e as demais — são normativas em
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md) §5.
Estas são as específicas do alias:

**1. Alias é da fonte, e quando necessário da loja.** Um alias confirmado para a fonte A não
diz nada sobre a fonte B, mesmo com descrição idêntica. Quando a fonte pratica catálogo por
loja, o alias também é da loja.

**2. Alias nunca transforma outro tamanho em produto exato.** Se o item da fonte é 500 g e o
SKU do catálogo é 1 kg, não existe alias que os una. A relação correta é OUTRO TAMANHO
([`../product/CANONICAL-PRODUCT-SPEC.md`](../product/CANONICAL-PRODUCT-SPEC.md) §3), e ela vive
em outro lugar da interface. Alias não é atalho para furar o princípio 1 do `CLAUDE.md`.

**3. GTIN com checksum válido não comprova identidade sozinho.** O dígito verificador prova que
o número está bem formado — não que ele identifica o que a fonte diz identificar. Fontes
publicam GTIN errado, GTIN de outra variante e GTIN de outro tamanho. Some-se a isso a
reformulação silenciosa de
[`../product/CANONICAL-PRODUCT-SPEC.md`](../product/CANONICAL-PRODUCT-SPEC.md) §4.5, em que o
mesmo GTIN cobre duas quantidades: **a quantidade vence o GTIN**, aqui também.

**4. EAN encontrado apenas em nome de arquivo não cria alias.** Um número de treze dígitos no
`filename` de uma imagem é convenção interna de quem publicou, não campo estruturado. Vale como
pista para uma pessoa olhar; não vale como `source_gtin` e não vale como `matching_method`.

**5. Alteração substancial na descrição volta para revisão.** `confirmed` passa a
`needs_review` automaticamente. "Substancial" precisa ser definido em critério escrito no
contrato de conector (PM-DATA-04) — e, enquanto não estiver, qualquer alteração volta para
revisão. Errar para o lado de revisar demais custa tempo; errar para o outro publica preço
errado.

**6. Correspondência ambígua nunca é aprovada automaticamente.** Dois candidatos plausíveis é
`proposed` com os dois anotados, para uma pessoa desempatar. Nenhum limiar, nenhum escore e
nenhum modelo autoriza escolher sozinho — a Classe B de
[`../post-mvp/AUTOMATION-QUALITY-GATES.md`](../post-mvp/AUTOMATION-QUALITY-GATES.md) §1 é
exatamente este caso, e ela **não tem caminho automático para publicado**.

**7. Nenhum alias é criado a partir de dado pessoal.** Nem para identificar o item, nem para
identificar quem confirmou, nem em `notes`. O ViPreço não coleta dado pessoal para esta
finalidade e não passa a coletar por causa de um conector.

---

## 6. Relação com procedência e qualidade

O alias decide **qual produto**. Ele não decide, e não pode insinuar, a origem do preço: preço
resolvido por alias e publicado continua sendo **coletado por conector**, com a procedência
escrita literalmente segundo
[`../post-mvp/PRICE-PROVENANCE-POLICY.md`](../post-mvp/PRICE-PROVENANCE-POLICY.md) §2. Um alias
confirmado por pessoa **não** transforma o preço em "informado pelo mercado" — ninguém do
mercado informou nada.

Identidade é uma das catorze dimensões de
[`../post-mvp/AUTOMATION-QUALITY-GATES.md`](../post-mvp/AUTOMATION-QUALITY-GATES.md) §2:
identidade errada reprova a oferta inteira, com preço certo e tudo.

---

## 7. O que este documento não decide

- **se** algum conector será construído — Gate PM-DATA-0;
- **se** alguma fonte pode ser lida — Gate PM-DATA-1, revisão jurídica;
- a **forma** do armazenamento (tabela, colunas, tipos) — contrato de conector, PM-DATA-04;
- o critério exato de "alteração substancial" — PM-DATA-04;
- qualquer schema. **Nenhuma tabela e nenhuma migration nascem deste documento.**
