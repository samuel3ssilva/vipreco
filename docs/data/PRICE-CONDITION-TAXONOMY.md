# Tipos de preço, canais e condições de acesso

**Status: NORMATIVO como registro de contrato. NÃO É ESCOPO DO MVP.**

> **Nada aqui está implementado e nada aqui autoriza implementação.** Nenhuma coluna, nenhum
> enum, nenhuma migration. Este documento descreve o dado que precisará existir **se e quando**
> o Gate PM-DATA-0 aprovar a trilha de ingestão automática.
>
> **As promoções tipificadas do MVP continuam normativas e inalteradas** em
> [`PROMOTION-TYPES.md`](PROMOTION-TYPES.md). Este documento não as substitui, não as amplia e
> não as contradiz.

---

## 1. Por que separado de `PROMOTION-TYPES.md`

As duas coisas parecem próximas e são ortogonais.

|                    | [`PROMOTION-TYPES.md`](PROMOTION-TYPES.md)                 | este documento                                      |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------- |
| **Pergunta**       | qual **mecânica de desconto** e como ela calcula o efetivo | **qual preço é este**, em que canal, com que acesso |
| **Exemplos**       | leve 3 pague 2 · 2ª unidade com 50% · limite por cliente   | preço de clube · preço online · preço de atacado    |
| **Fase**           | MVP · E2.7                                                 | **pós-MVP**                                         |
| **Efeito no card** | pode exibir preço efetivo junto da condição                | decide **se os dois preços sequer se comparam**     |

A ortogonalidade é literal: um preço de clube **sem** promoção existe; uma promoção "leve 3
pague 2" **no canal online** existe; um preço de atacado com limite por cliente existe. As duas
dimensões se combinam livremente, e por isso não cabem numa lista só.

Há também um motivo de escopo, e ele é o mais decisivo:
[`PROMOTION-TYPES.md`](PROMOTION-TYPES.md) é normativo para **E2.7**, e serve de base para as
migrations de R2. Escrever a taxonomia pós-MVP dentro dele a colocaria na fila de implementação
do MVP por acidente — o risco que o mandato R0.6 §5 nomeia. Este documento fica de fora
justamente para que isso não aconteça.

---

## 2. As quatro dimensões

Uma oferta coletada precisa responder quatro perguntas independentes. Onde este documento diz
"campo", leia "campo ou estrutura equivalente" — a forma final é decisão do contrato de conector
(PM-DATA-04).

### 2.1 Que preço é este

| Campo               | O que significa                                                         |
| ------------------- | ----------------------------------------------------------------------- |
| `regular_price`     | o preço praticado normalmente, sem condição                             |
| `list_price`        | preço "de tabela" anunciado como referência — **não** é preço praticado |
| `promotional_price` | preço temporário, com validade                                          |
| `club_price`        | preço condicionado a programa de fidelidade                             |
| `card_price`        | preço condicionado a meio de pagamento específico                       |
| `bulk_price`        | preço a partir de quantidade mínima                                     |
| `bulk_min_quantity` | a quantidade mínima que destrava `bulk_price`                           |
| `bundle_price`      | preço de conjunto de itens comprados juntos                             |
| `unit_price`        | preço por unidade de contagem                                           |
| `price_per_kg`      | preço por quilo                                                         |

`unit_price` e `price_per_kg` continuam **derivados, nunca armazenados** — a regra de
[`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §2 vale igual aqui, e pela mesma razão: um preço
unitário guardado envelhece em relação ao preço e vira mentira silenciosa. Eles aparecem nesta
lista porque uma fonte pode **publicar** esses números, e publicar não é o mesmo que serem
verdade — quando a fonte publica, o valor é evidência a conferir, não valor a exibir.

`list_price` merece atenção própria: é o número riscado ao lado da oferta. Ele **não** é o preço
regular atual e **não** pode alimentar `previous_price` — ver §4.

### 2.2 Por onde se compra

| Campo                  | O que significa                       |
| ---------------------- | ------------------------------------- |
| `sales_channel`        | o canal ao qual o preço pertence      |
| `online_price`         | preço do canal de venda pela internet |
| `physical_store_price` | preço da gôndola física               |
| `pickup_price`         | preço para retirada na loja           |
| `delivery_price`       | preço para entrega                    |

### 2.3 Que condição de acesso

| Campo                         | O que significa                                                       |
| ----------------------------- | --------------------------------------------------------------------- |
| `requires_membership`         | exige adesão a programa de fidelidade                                 |
| `requires_card`               | exige meio de pagamento específico                                    |
| `requires_cpf_identification` | a loja exige identificação por CPF **no caixa** para conceder o preço |
| `condition_text`              | a condição como a fonte a escreve, preservada literalmente            |

**`requires_cpf_identification` descreve uma condição comercial da loja. Não é, e nunca vira,
CPF de ninguém.** É um booleano que diz "esta oferta exige que a pessoa se identifique no
caixa" — informação que o consumidor precisa ter **antes** de ir à loja, porque quem não quer se
identificar não tem acesso àquele preço.

> **O ViPreço não coleta, não armazena, não solicita e não transporta CPF.** Nem de consumidor,
> nem de operador, nem em campo estruturado, nem em texto livre, nem em `notes`, nem em log.
> Esta regra não tem exceção e não é afetada por nenhuma decisão futura desta trilha.

`condition_text` segue a regra de `special_condition`
([`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §3): texto para leitura humana, e **nenhuma
regra computável depende dele**. Quando uma condição recorrente aparecer com frequência
suficiente, ela vira campo estruturado por decisão do PMO — nunca por heurística de texto.

### 2.4 Onde e quando vale

| Campo         | O que significa                                       |
| ------------- | ----------------------------------------------------- |
| `store_id`    | a loja específica                                     |
| `region_id`   | a região à qual o preço se aplica                     |
| `observed_at` | quando **nós** observamos — já existe hoje            |
| `valid_from`  | início da vigência declarada pela fonte               |
| `valid_until` | fim da vigência declarada pela fonte — já existe hoje |

`observed_at` e `valid_until` já existem e mantêm o significado atual
([`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §3, [`OFFER-STATES.md`](OFFER-STATES.md)).
`valid_from` é novo e não é redundante com `observed_at`: uma fonte pode publicar hoje uma
oferta que começa na segunda-feira, e exibir isso como vigente seria anunciar preço que ainda
não existe.

---

## 3. As regras que não se negociam

As regras gerais de matching — `varejo ≠ atacado`, `preço geral ≠ preço de clube`, `preço online
≠ automaticamente preço de loja física` — são normativas em
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md) §5.
Estas são as consequências específicas da taxonomia:

**1. Preço por quantidade não é preço comum.** `bulk_price` só vale a partir de
`bulk_min_quantity`. Exibir o preço de atacado como preço da unidade é prometer um valor que a
pessoa não consegue no caixa levando um item.

**2. Preço de clube não é preço geral.** Quem não é do programa paga outro valor. Um
`club_price` na lista orgânica ao lado de preços gerais compara duas coisas diferentes e
favorece a rede que tem programa de fidelidade — o oposto da neutralidade do princípio
inviolável #4 do `CLAUDE.md`.

**3. Preço com cartão não está disponível para todos.** Mesma lógica de `club_price`, com uma
barreira a mais: exige um meio de pagamento específico.

**4. Preço online não é automaticamente preço de loja física.** São canais com estruturas de
custo diferentes, e a mesma rede pratica valores diferentes nos dois. Ler um e publicar como o
outro é inventar um preço que nunca existiu.

**5. Retirada não é entrega.** `pickup_price` e `delivery_price` são preços distintos do mesmo
item, e a diferença costuma ser exatamente o frete.

**6. Preço regional não vale automaticamente em todas as unidades.** `region_id` sem `store_id`
é preço de região, e "preço da rede" só existe quando a fonte afirma que existe. Na dúvida, o
preço é da loja em que foi observado — e se nem isso se sabe, não há preço publicável.

**7. Preço anterior não é automaticamente preço regular atual.** `list_price` — o número riscado
— é material de anúncio, não observação nossa. Ele **não** pode alimentar `previous_price`:
[`OFFER-STATES.md`](OFFER-STATES.md) §5 exige que o preço anterior venha de **observação
anterior real**, com `observed_at` conhecido, e proíbe preencher com "preço de tabela" ou
qualquer valor sem procedência. A regra vale aqui sem atenuação.

**8. Condição nunca fica escondida.** Se o preço depende de clube, cartão, canal, quantidade
mínima ou identificação no caixa, **a condição aparece junto do preço** — mesmo tamanho de
compromisso, no mesmo lugar da tela, não em nota de rodapé. Um preço condicionado exibido como
preço comum é a falha que este documento inteiro existe para impedir.

**9. Preço com condição não reordena a lista orgânica.** A regra 1 de
[`PROMOTION-TYPES.md`](PROMOTION-TYPES.md) §2 vale igual: a lista é ordenada pelo preço que
qualquer pessoa consegue, sem condição. Um preço de clube que aparecesse em primeiro lugar
transformaria programa de fidelidade em posição de ranking.

---

## 4. Relação com o que já existe

| Já normativo                                                                       | O que este documento faz                                                      |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`PROMOTION-TYPES.md`](PROMOTION-TYPES.md) — 4 tipos do MVP                        | **preserva integralmente.** Dimensão ortogonal, não substituta                |
| [`OFFER-STATES.md`](OFFER-STATES.md) — estados e preço anterior                    | **preserva.** `list_price` fica explicitamente proibido como `previous_price` |
| [`MVP-DATA-CONTRACT.md`](MVP-DATA-CONTRACT.md) §2 — unitário                       | **preserva.** Unitário continua calculado, nunca armazenado                   |
| [`../post-mvp/PRICE-PROVENANCE-POLICY.md`](../post-mvp/PRICE-PROVENANCE-POLICY.md) | **preserva.** Tipo de preço não altera procedência                            |

Canal, tipo, condição e loja são **quatro** das catorze dimensões de
[`../post-mvp/AUTOMATION-QUALITY-GATES.md`](../post-mvp/AUTOMATION-QUALITY-GATES.md) §2 — mais
de um quarto do critério de precisão composta depende só desta taxonomia. Errar qualquer uma
reprova a oferta inteira.

---

## 5. O que este documento não decide

- **se** algum conector será construído — Gate PM-DATA-0;
- a **forma** do armazenamento (colunas, enums, tabela associada) — PM-DATA-04;
- se algum destes campos entra no MVP. **Nenhum entra.** O MVP fecha inteiro com
  [`PROMOTION-TYPES.md`](PROMOTION-TYPES.md) e [`OFFER-STATES.md`](OFFER-STATES.md);
- qualquer schema. **Nenhuma migration nasce deste documento.**
