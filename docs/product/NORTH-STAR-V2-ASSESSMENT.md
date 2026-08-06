# North Star V2 — avaliação e decisões consolidadas

**Registrado em 2026-08-06.** **NORMATIVO** como registro de decisão de produto e design.
Subordinado ao `PLANO-MESTRE.md` e aos contratos funcionais de `docs/product/` e `docs/data/`.

**Origem:** mandato do Founder/PMO de 06/08/2026, §3. O North Star V2 foi aprovado como
proposta para consolidar o roadmap, **sujeito aos contratos funcionais e de dados da `main`** —
a mesma subordinação que já valia para o North Star original
([`VISUAL-IMPLEMENTATION-CONTRACT.md`](./VISUAL-IMPLEMENTATION-CONTRACT.md) §2).

---

## 1. Os três níveis, e qual manda

| Nível                   | O que é                                                      | Autoridade                               |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **North Star original** | o PNG de 05/08/2026, em `visual-north-star/`                 | **HISTÓRICO** — referência de forma      |
| **North Star V2**       | as decisões consolidadas deste documento                     | **REFERÊNCIA ATUAL** de produto e design |
| **Contratos da `main`** | `docs/product/`, `docs/data/`, `docs/security/`, `CLAUDE.md` | **AUTORIDADE FUNCIONAL SUPERIOR**        |

Em conflito **funcional**, ganha o contrato — sem exceção e sem discussão caso a caso.
Em conflito **estético** não coberto por contrato, decide o Founder.

O North Star original **não foi apagado e não será**. Ele continua em
[`visual-north-star/`](./visual-north-star/), continua referenciado pelo contrato visual, e
continua sendo o registro do que foi aprovado em 05/08/2026.

---

## 2. Assets do North Star V2 — **RECEBIDOS EM 06/08/2026**

A primeira versão deste documento registrava que os materiais anunciados no mandato não tinham
chegado, e que nada seria inventado no lugar deles. **Eles chegaram no mesmo dia**, no pacote
`vipreco-north-star-v2-fable.zip`
(`c875d49ec6f4c5d5d2cf3d5954559f874fe1843a404a63eb955b36364fe7018e`, 3 489 401 bytes).

Versionados byte a byte em [`visual-north-star-v2/`](./visual-north-star-v2/), com ficha completa
de hash, dimensões, tamanho, origem e data em
[`visual-north-star-v2/README.md`](./visual-north-star-v2/README.md):

- **as cinco telas**, 1206 × 2622 px cada, em `telas/`;
- **o documento do North Star V2** e **o assessment de UX**, em `fonte/`.

Três decisões de registro, todas com o motivo escrito na ficha:

1. **O North Star original não foi substituído**, e há prova: o PNG que veio dentro do pacote,
   em `uploads/`, tem exatamente o mesmo SHA-256 (`7b7a28b5…`) do que já estava versionado em
   [`visual-north-star/`](./visual-north-star/). É o mesmo arquivo, usado pelo Fable como
   referência. Não havia o que substituir.
2. **O `ViPreco Redesign.dc.html` ficou fora do repositório**, com o hash registrado. Ele é o
   passo intermediário entre o assessment e o V2, e os mockups dele mostram redes reais rotuladas
   como parceiras, prova social inventada e histórico de preço com percentual — as três coisas
   que o próprio V2 corrigiu. Este repositório é público. A decisão foi minha, está justificada
   na ficha e é reversível com um `cp`.
3. **O runtime do Fable** (`support.js`, `doc-page.js`, `ios-frame.jsx`) e a miniatura ficaram
   fora: são ferramenta, não asset do produto.

**O documento não é só as cinco telas.** Ele tem oito seções, e três delas não existem como
imagem em lugar nenhum: os **oito estados de ausência**, a tabela **antes/depois** contra o North
Star original e a classificação de **impacto no roadmap** em quatro faixas. É por isso que o HTML
foi versionado, e não apenas os PNG.

**A matriz da §3 foi escrita antes dos binários chegarem, a partir do texto do mandato.** Ela foi
reconferida contra o documento recebido: as decisões batem, e as três células que diziam "não
recebida" puderam ser preenchidas com a fonte. O que mudou está marcado na §3.1.

---

## 3. Matriz — elemento a elemento

Legenda de estado: **aplicado** = já está no código da `main` ou do PR em revisão ·
**decidido** = decisão registrada, implementação numa fase futura ·
**fora de escopo** = não entra no MVP.

A coluna "Proposta do North Star V2" registra a resolução que veio no mandato §3 e, desde
06/08/2026, foi reconferida contra o documento recebido (§2). Nada foi inferido: cada célula sai
do mandato ou do documento, e as três que diziam "não recebida" agora saem do documento.

| #   | Elemento no North Star original                                                   | Problema                                                                                           | Proposta do North Star V2                                                        | Decisão consolidada                                                                               | Fase       | Requisito de dados             | Estado                                        |
| --- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- | ------------------------------ | --------------------------------------------- |
| 1   | Barra inferior com **5 abas** (Achados, Buscar, Comparar, Favoritos, Mais)        | "Favoritos" está fora do MVP; "Comparar" como aba sugere uma tela que existe sem produto escolhido | **duas abas B2C: Achados e Buscar**                                              | duas abas, e só                                                                                   | R3.3       | nenhum                         | **decidido**                                  |
| 2   | Aba "Comparar" independente                                                       | comparação sem `product_id` não compara nada                                                       | **a comparação nasce do produto**                                                | rota `/produto/$productId`, alcançada a partir de um SKU (DL-014)                                 | R5         | `product_id`                   | **decidido**                                  |
| 3   | Tela 4 "Detalhe da oferta" solta                                                  | detalhe sem oferta de origem é ficha de catálogo                                                   | **o detalhe nasce da oferta**                                                    | detalhe é aprofundamento de uma oferta observada, não uma quinta tela autônoma                    | R6         | `price_id`                     | **decidido**                                  |
| 4   | Tela 5 inteira dedicada ao WhatsApp, mais aba própria                             | WhatsApp ocupando 1/5 do produto inverte a tese: comparação é o núcleo                             | **WhatsApp é contextual**                                                        | CTA no contexto em que faz sentido; sem tela própria, sem aba                                     | R7         | número em secret               | **decidido**                                  |
| 5   | Nenhuma superfície para o mercado                                                 | o piloto depende de mercados, e o mockup não os enxerga                                            | **`/para-mercados` é uma rota B2B separada**                                     | rota separada, **nunca** aba do app B2C                                                           | B2B-0      | nenhum                         | **aplicado** (rota existe)                    |
| 6   | Preço em destaque, identidade em texto miúdo                                      | preço que o leitor não sabe de qual item é não serve para comparar                                 | **produto exato antes do preço**                                                 | nome, marca, variante e quantidade acima do preço                                                 | R3.2       | E1                             | **aplicado** (Card v2)                        |
| 7   | "Preço anterior: R$ 20,49" e queda percentual                                     | exige histórico do mesmo SKU no mesmo mercado; a janela (P-01) não foi decidida                    | **diferença observada somente quando comparável**                                | **removido** do Card v2 até P-01 ser decidida                                                     | R6/R8      | `price_events` + P-01          | **decidido** — ver DL-030                     |
| 8   | "O melhor preço perto de você"                                                    | promessa absoluta sobre o mundo, não sobre o que foi medido                                        | **nenhuma promessa absoluta**                                                    | "menor preço **observado**", com data                                                             | todas      | `observed_at`                  | **aplicado** (testado)                        |
| 9   | "Ofertas reais de mercados próximos"                                              | "próximos" implica localização que o produto não tem                                               | **localização funciona sem GPS obrigatório**                                     | bairro como âncora; nenhuma permissão de GPS pedida                                               | R3.3       | `neighborhood`                 | **decidido**                                  |
| 10  | Proximidade sugerida sem distância                                                | distância exige geocodificação e consentimento                                                     | **distância depende de consentimento e geocodificação**                          | não entra no MVP; bairro é a âncora                                                               | pós-MVP    | geocodificação                 | **fora de escopo**                            |
| 11  | "Promoção: Leve 3, pague 2" isolada                                               | promoção sem a condição e sem o desembolso é meia informação                                       | **promoções mostram condição e desembolso**                                      | condição sempre junto; preço efetivo **dentro** da linha da condição, nunca sozinho               | R3.2 → R6  | `PROMOTION-TYPES`              | **aplicado** parcialmente (condição em texto) |
| 12  | "Confiança da informação" com mercado, fonte, atualização e validade num bloco só | mistura quatro dimensões que respondem perguntas diferentes                                        | **fonte, atualização, confirmação e relação comercial são dimensões diferentes** | quatro dimensões distintas; relação comercial **nunca** se disfarça de procedência                | R6         | `source_type`, `observed_at`   | **decidido**                                  |
| 13  | Logotipos de rede nos cards (Bom Preço, Mix Mateus, Assaí)                        | imagem de terceiro sem direito de uso; sugere parceria inexistente                                 | **mercados e marcas fictícios; ilustrativo marcado com `*`**                     | identificação **textual** do mercado até haver autorização registrada                             | R3.2       | `markets.name`                 | **aplicado**                                  |
| 14  | Nenhuma marcação de conteúdo pago                                                 | o mockup não distingue orgânico de pago porque não previu o pago                                   | **parceria ou patrocínio nunca altera ranking**                                  | seção separada e rotulada; a ordem é preço → observação → `id`, sempre                            | R6+        | contrato normativo inexistente | **decidido** — nada se desenha antes          |
| 15  | `R$ 35,98/kg` em **todos** os cards                                               | exige quantidade estruturada e confiável, que só existe depois de E1                               | **preço unitário depende de quantidade confiável**                               | condicional: `calculation_status = ok` ou o campo **some**                                        | R3.2       | E1 · `quantity_value`/`unit`   | **aplicado**                                  |
| 16  | Todos os cards completos e vigentes                                               | um mockup só mostra o caso bom; o produto real vive de casos incompletos                           | **estados incompletos fazem parte do produto**                                   | sem imagem, sem validade, expirada, desatualizada e erro parcial são variantes de primeira classe | R3.2       | `OFFER-STATES`                 | **aplicado** (8 variantes)                    |
| 17  | Sino de notificação no header                                                     | notificações estão fora do MVP                                                                     | **removido** ("Removido: sino…")                                                 | não entra                                                                                         | —          | —                              | **fora de escopo**                            |
| 18  | Aba "Favoritos"                                                                   | fora do MVP                                                                                        | **removido** ("abas Favoritos/Comparar/Mais")                                    | não entra                                                                                         | —          | —                              | **fora de escopo**                            |
| 19  | Ausente no original                                                               | —                                                                                                  | **Lista de compras permanece pós-piloto**                                        | não entra no MVP nem no piloto                                                                    | pós-piloto | —                              | **fora de escopo**                            |
| 20  | Ausente no original                                                               | —                                                                                                  | **painel completo para mercados permanece pós-MVP**                              | B2B-5; `/para-mercados` **não** é painel                                                          | pós-MVP    | —                              | **fora de escopo**                            |

### Os três itens que mudam o que já está escrito

**#7 — histórico de preço.** É o único item da matriz que **retira** algo que já estava
implementado. O Card v2 do PR #89 exibia "antes R$ 14,90 · 13% mais barato que em 25/07/2026".
A regra estava correta e testada; o que falta é o contrato: a janela de seleção da observação
anterior (P-01 / MVP-DOCS-02) nunca foi decidida, e sem ela o percentual é um número cuja
procedência ninguém consegue defender. Removido do card e da demonstração. Volta em R6/R8,
depois de P-01. Registro em DL-030.

**#12 — quatro dimensões, não uma.** "Coleta da comunidade" (fonte), "24/05 às 08:32"
(atualização), "confirmado pelo mercado" (confirmação) e "mercado parceiro" (relação comercial)
são quatro coisas diferentes que o mockup empilha sob o rótulo "Confiança da informação". A
quarta é a perigosa: relação comercial apresentada como sinal de confiança é conteúdo pago
travestido de procedência. As quatro ficam separadas, e a quarta não existe enquanto não houver
contrato.

**#1 e #2 — a navegação.** Cinco abas viram duas. A decisão não é de estética: cada aba é uma
promessa de que existe uma tela que se sustenta sozinha, e "Comparar" sem produto escolhido não
se sustenta.

### 3.1 O que o documento acrescentou, quando chegou

A matriz foi escrita em 06/08/2026 a partir do texto do mandato, antes dos binários. Com o
documento em mãos ([`visual-north-star-v2/fonte/north-star-v2.html`](./visual-north-star-v2/fonte/north-star-v2.html)),
nenhuma linha precisou ser desdita. Três ganharam fonte, e três coisas novas entraram.

**As três células que diziam "não recebida" agora têm origem.** #13 (logotipos), #17 (sino) e #18
(aba Favoritos): a seção "Racional de design" do documento lista, na tela 1, _"Removido: sino,
logos de mercado, 2º CTA verde, abas Favoritos/Comparar/Mais"_, e a tabela antes/depois troca
_"Marcas e redes reais (Pilão, Assaí, Mix Mateus) como se fossem parceiras"_ por _"Mercados e
marcas fictícios; números marcados como ilustrativos (\*)"_.

**O documento confirma duas pendências já registradas, agora com fonte citável.** "Navegação com
2 abas · 1 CTA por tela" está na faixa _"Necessária para o MVP"_ da classificação de roadmap, e o
app hoje tem quatro abas. "Histórico de preço e alertas de queda" está na faixa _"Fora do escopo
atual"_, e a Home ainda exibe "antes R$ 29,90". As duas são R3.3.

**E ele acrescenta uma distinção que a matriz não fazia: diferença observada ≠ histórico.** As
cinco telas dizem "R$ 0,50 abaixo da próxima oferta observada". Isso é a distância para o
**segundo mercado da mesma comparação, medida no mesmo instante** — não para um preço passado. A
regra escrita é _"substitui 'economize': sempre com universo delimitado e só entre ofertas
comparáveis"_.

A diferença importa para o planejamento: essa não depende de P-01 nem de `price_events`, porque
os dois preços já estão na mesma consulta que ordena a comparação. Ela não é o que DL-030 removeu
e não está bloqueada pelo mesmo contrato. Continua **não implementada**, e entra na fase da
comparação (R5/R6), sujeita a uma regra explícita sobre o que fazer quando só há um mercado.

**Um alerta de leitura, e é o motivo de o assessment estar versionado com rótulo.** O
[`mvp-assessment.html`](./visual-north-star-v2/fonte/mvp-assessment.html) é a revisão de UX que
**precedeu** o V2, e o plano de ação dele recomenda coisas que o V2 depois rejeitou: prova social
("2.300 vizinhos de Artemis já recebem"), economia contra preço anterior com percentual,
sparkline de 30 dias, alerta de queda e um selo "Parceiro oficial" que dá presença mais rica a
quem participa. Esta última contraria a neutralidade do `PLANO-MESTRE.md` diretamente. O
assessment é **entrada**, não decisão. Quem o executar como plano reinstala o que o V2 tirou.

---

## 4. As decisões consolidadas, na íntegra

Como vieram no mandato §3, sem edição:

1. duas abas B2C: Achados e Buscar;
2. comparação nasce do produto;
3. detalhe nasce da oferta;
4. WhatsApp é contextual;
5. `/para-mercados` é uma rota B2B separada;
6. produto exato antes do preço;
7. diferença observada somente quando comparável;
8. nenhuma promessa absoluta;
9. localização funciona sem GPS obrigatório;
10. distância depende de consentimento e geocodificação;
11. promoções mostram condição e desembolso;
12. fonte, atualização, confirmação e relação comercial são dimensões diferentes;
13. parceria ou patrocínio nunca altera ranking;
14. preço unitário depende de quantidade confiável;
15. estados incompletos fazem parte do produto;
16. Lista de compras permanece pós-piloto;
17. painel completo para mercados permanece pós-MVP.

---

## 5. O que este documento não autoriza

Não inicia fase nenhuma. Não autoriza migration, backfill, deploy, dado real, contato externo
nem variante patrocinada. Cada um desses continua atrás do seu próprio gate, exatamente onde
estava antes desta página existir.

---

## Documentos relacionados

- [`ROADMAP-MVP-V2.md`](./ROADMAP-MVP-V2.md) — as duas trilhas
- [`VISUAL-IMPLEMENTATION-CONTRACT.md`](./VISUAL-IMPLEMENTATION-CONTRACT.md) — direção visual e os 20 princípios
- [`visual-north-star-v2/README.md`](./visual-north-star-v2/README.md) — o registro dos assets
- [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) — DL-029, DL-030, DL-031
- [`../data/OFFER-STATES.md`](../data/OFFER-STATES.md) §5 — preço anterior, e a pendência P-01
