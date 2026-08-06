# Roadmap MVP v3 — documento normativo do escopo de produto

> **SUBSTITUÍDO COMO ROADMAP POR [`ROADMAP-MVP-V2.md`](./ROADMAP-MVP-V2.md) EM 06/08/2026.**
>
> Este documento **não foi apagado e não será**. Ele continua sendo a fonte do que decidiu sobre
> **escopo** — os três épicos (§2), os habilitadores (§3), a lista fechada de "Fora do MVP" (§4) e
> o que continua verdade (§6) —, e o `ROADMAP-MVP-V2.md` incorpora essas seções por referência em
> vez de copiá-las.
>
> O que mudou é o **roadmap**: a sequência da §5 abaixo é histórica. A ordem vigente está no
> `ROADMAP-MVP-V2.md` §3, com duas trilhas — B2C (R0 a R9) e B2B (B2B-0 a B2B-5). O `V2` do nome
> não é uma versão anterior ao `v3`: são numerações de coisas diferentes, e o motivo está escrito
> no §0 daquele documento.

**Status: NORMATIVO no escopo de produto; HISTÓRICO como roadmap.** Este documento foi a fonte
oficial de verdade do **escopo de produto** do MVP do ViPreço a partir de 02/08/2026. Onde houver
contradição com documentos anteriores sobre escopo de produto, este documento prevalece — e o
documento anterior recebe a marcação `SUPERSEDED FOR MVP PRODUCT SCOPE BY ROADMAP-MVP-v3`.

**O que este documento NÃO substitui:** governança (`PLANO-MESTRE.md` §0, §9, §14, §15), segurança
(`docs/security/`), infraestrutura e operação (`docs/operations/`), acessibilidade
(`docs/accessibility/`) e as evidências das Partes 1, 2 e 3 já concluídas. Essas continuam válidas e
vinculantes.

**Origem:** REBASELINE TECHNICAL ASSESSMENT (Fase R0, 02/08/2026, veredito
`HUMAN DECISIONS REQUIRED`) e o mandato da Fase R0.5 do Founder/PMO, que resolveu as decisões
centrais. As decisões estão registradas uma a uma em [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md).

---

## 1. Definição oficial do produto

> O ViPreço ajuda o usuário a encontrar, reconhecer e comparar o mesmo produto entre diferentes
> mercados, com preço, mercado, fonte, data e validade.

**A comparação é o núcleo do MVP.** Achados e WhatsApp continuam existindo, e continuam
importantes — mas como mecanismos de aquisição, descoberta e retenção, não como o produto.

Essa é a mudança de enquadramento que este roadmap formaliza. O roadmap anterior tratava a
comparação como fase futura e os Achados como a experiência principal. A partir daqui é o
contrário.

---

## 2. Os três épicos

### E1 — Identidade exata do produto

Um registro de produto representa um **SKU exato**. Não uma família, não uma categoria, não uma
aproximação.

| #     | Item                                           | Estado hoje                                      |
| ----- | ---------------------------------------------- | ------------------------------------------------ |
| E1.1  | registro de produto representa SKU exato       | parcial — a tabela existe, mas mistura conceitos |
| E1.2  | marca                                          | existe como texto livre                          |
| E1.3  | variante                                       | existe como texto livre                          |
| E1.4  | quantidade                                     | **não existe** — só a string `size_text`         |
| E1.5  | unidade                                        | **não existe**                                   |
| E1.6  | embalagem (`package_type`)                     | **não existe**                                   |
| E1.7  | GTIN opcional                                  | existe, texto, único quando presente             |
| E1.8  | aliases de busca                               | **não existem**                                  |
| E1.9  | imagem revisada                                | **não existe**                                   |
| E1.10 | fonte da imagem                                | **não existe**                                   |
| E1.11 | quantidade normalizada                         | **não existe**                                   |
| E1.12 | preço por unidade                              | **não existe**                                   |
| E1.13 | separação entre exato, outro tamanho e similar | **não existe**                                   |

Contrato completo em [`../data/MVP-DATA-CONTRACT.md`](../data/MVP-DATA-CONTRACT.md) e
[`CANONICAL-PRODUCT-SPEC.md`](CANONICAL-PRODUCT-SPEC.md).

### E2 — Comparação confiável

| #     | Item                                          | Estado hoje                                                 |
| ----- | --------------------------------------------- | ----------------------------------------------------------- |
| E2.1  | busca visível na primeira dobra               | **não** — hoje a busca fica abaixo dos Achados              |
| E2.2  | nenhuma seleção prévia obrigatória de mercado | **já atendido**                                             |
| E2.3  | CTA "Comparar em X mercados"                  | parcial — o rótulo é "Ver preços por mercado", sem contagem |
| E2.4  | comparação do mesmo SKU                       | **já atendido** — chaveia num único `product_id`            |
| E2.5  | mercado e localização                         | **já atendido** — nome, bairro; cidade entra por TD-003     |
| E2.6  | fonte, data e validade                        | **já atendido**                                             |
| E2.7  | promoções estruturadas                        | **não** — só texto livre em `special_condition`             |
| E2.8  | estados ativo, encerrado, esgotado e expirado | **não** — só `is_active` e `valid_until`                    |
| E2.9  | ranking neutro                                | **já atendido** — `is_featured` não entra na comparação     |
| E2.10 | preço anterior rastreável                     | **não** — o histórico é invisível para o público            |
| E2.11 | nenhum conteúdo pago alterando ordem          | **já atendido**, e é regra inviolável                       |

Contrato completo em [`COMPARISON-SPEC.md`](COMPARISON-SPEC.md),
[`../data/OFFER-STATES.md`](../data/OFFER-STATES.md) e
[`../data/PROMOTION-TYPES.md`](../data/PROMOTION-TYPES.md).

### E3 — Aquisição e retenção

| #    | Item             | Estado hoje                                               |
| ---- | ---------------- | --------------------------------------------------------- |
| E3.1 | Achados          | **já atendido** — `AchadoCard`, primeira dobra da Home    |
| E3.2 | compartilhamento | **já atendido** — Web Share → WhatsApp → copiar           |
| E3.3 | WhatsApp         | **já atendido** — CTA único via `wa.me`, número em secret |
| E3.4 | mapa             | **já atendido** — `maps_url` por mercado                  |
| E3.5 | analytics        | **não existe** — nenhum evento, nenhuma biblioteca        |
| E3.6 | opt-in           | **não existe**                                            |
| E3.7 | funil medido     | **não existe**                                            |

O funil a medir:

```
visita → busca ou Achado → comparação → ação externa ou opt-in
```

Taxonomia em [`../analytics/MVP-EVENT-TAXONOMY.md`](../analytics/MVP-EVENT-TAXONOMY.md).

---

## 3. Habilitadores

Não são épicos, mas nenhum épico entrega sem eles.

| Habilitador     | Estado                                                                   | Onde                                |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| Segurança       | maduro — Onda 3 concluída, CSP, headers, superfícies de escrita fechadas | `docs/security/`                    |
| RLS             | maduro; **muda em E2.8** com leitura pública controlada                  | `../data/OFFER-STATES.md`           |
| SSR             | maduro — Home e produto servidos por loader, sem estado de carregamento  | `../mvp/HOME-INITIAL-RENDER.md`     |
| Performance     | atenção — `getProductsPriceStats` sem `limit` (TD-004)                   | `../pmo/TECHNICAL-DEBT-REGISTER.md` |
| Imagens         | não existe; entra no MVP com regras estritas                             | `../data/IMAGE-POLICY.md`           |
| Acessibilidade  | maduro — WCAG 2.2 AA, alvos de 48 px, foco visível                       | `docs/accessibility/`               |
| Operação manual | documentada, mas incompleta para o v3                                    | `../mvp/MANUAL-OFFER-OPERATIONS.md` |
| Documentação    | esta consolidação                                                        | `../INDEX.md`                       |

---

## 4. Fora do MVP

Lista fechada. Nenhum destes itens entra sem novo gate do Founder/PMO, e nenhum deve ser
"preparado por antecipação" no código.

- checkout
- pagamento
- entrega
- roteirização
- carrinho transacional
- otimização de cesta
- catálogo completo das lojas
- recomendação por IA
- avaliação pública
- cashback
- pontos
- alertas automatizados completos
- ranking pago
- conteúdo patrocinado misturado
- informação nutricional completa
- **comparação de similares como produtos idênticos**

O último item merece ênfase: não é uma funcionalidade adiada, é uma **proibição**. Similar nunca
entra na comparação exata, em nenhuma fase. Ver [`CANONICAL-PRODUCT-SPEC.md`](CANONICAL-PRODUCT-SPEC.md).

### Automação de ingestão de preços — fora do MVP

A trilha de **automação complementar de ingestão de preços** (conectores lendo preço de sites e
folhetos oficiais de redes) está registrada em
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md).

**Ela não faz parte do MVP e não bloqueia o MVP.** Não pode começar autonomamente, depende de Gate
humano em cada etapa, e nenhuma investigação autoriza publicação. Nenhum preço coletado entra no
produto nesta fase, e **nenhuma infraestrutura preventiva** é criada por antecipação.

Está registrada agora, e não depois, por um motivo só: quando o Gate de necessidade for avaliado, a
decisão precisa ser tomada sobre algo escrito.

**Sobre estudos anteriores:** o Founder/PMO relata **[F]** que dois estudos técnicos de fontes
foram produzidos antes desta fase. Eles não foram localizados nem verificados nesta missão — o
registro está em
[`../post-mvp/SOURCE-CONNECTOR-STATUS.md`](../post-mvp/SOURCE-CONNECTOR-STATUS.md) §4. **Devem ser
localizados, versionados ou substituídos por evidência reproduzível antes de qualquer spike
pós-MVP.** Este roadmap não afirma que investigação anterior nunca existiu.

---

As exclusões permanentes já registradas em `docs/mvp/TEST-MVP-PLAN.md` §4 (login de consumidor, Pix,
NFC-e, scanner de QR, geolocalização, notificações, painel administrativo completo, integração com
PDV, CRM, automação de WhatsApp, moderação pública de submissão) **continuam valendo** e somam-se a
esta lista.

---

## 5. Sequência de execução — **HISTÓRICA**

> A sequência abaixo é o registro de 02/08/2026. **A ordem vigente está em
> [`ROADMAP-MVP-V2.md`](./ROADMAP-MVP-V2.md) §3 e §4**, com o Card v2 em R3.2 (antes da Home) e
> uma trilha B2B paralela. A mudança está registrada em
> [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) DL-028.

Detalhamento em [`../pmo/MVP-EXECUTION-PLAN.md`](../pmo/MVP-EXECUTION-PLAN.md).

```
R0.5 fonte da verdade (esta rodada — documentação + 2 correções técnicas)
 └─ R1 produto canônico / SKU exato
     └─ R2 contrato de dados (quantidade, unidade, aliases)
         └─ R3 protótipos
             └─ R4 busca
                 └─ R5 comparação
                     └─ R6 Card v2          ◄── corte natural para o Gate V1
                         └─ R7 imagens e promoções
                             └─ R8 estados (gate) + analytics (gate separado)
                                 └─ R9 QA e piloto
```

**Nenhuma etapa a partir de R1 está autorizada por este documento.** Autorizar implementação é ato
separado do Founder/PMO.

---

## 6. O que continua verdade

Herdado de `PLANO-MESTRE.md` §12.5 e não alterado por este roadmap:

- nenhum dado pessoal real, nenhum mercado real sem autorização, nenhum preço real sem autorização;
- produção continua vazia e no `workers.dev`, sem DNS próprio;
- `vipreco.com.br` continua sem apontamento; o trabalho de domínio está **pausado** e o PR #44
  permanece aberto e intacto;
- nenhuma nova superfície pública de escrita em tabela de negócio — os três controles fechados na
  Onda 3 permanecem fechados e não renderizados;
- nenhuma migration é aplicada sem novo gate humano.
