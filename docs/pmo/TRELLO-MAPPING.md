# Mapa do Trello

**Status: NORMATIVO** para o conteúdo do quadro. Este documento existe para que o quadro seja montado
e reconciliado sem nenhuma decisão paralela: tudo o que um card precisa já está decidido aqui ou
aponta para o documento que decide.

**O quadro real existe e está sincronizado com este mapa.** Primeira sincronização em 03/08/2026,
contra a `main` em `af624250b159039ac4922f6b0a3de5bfbe3c39e4`. Quadro oficial
**ViPreço — MVP Artemis**, em
[trello.com/b/ThzNvV2Y](https://trello.com/b/ThzNvV2Y/vipreco-mvp-artemis), workspace
`Área de trabalho do Trello`. Estado registrado em [`trello/README.md`](trello/README.md) §14.

**A `main` do GitHub continua sendo a fonte normativa; o Trello representa a execução.** Card não
cria escopo: o caminho é este documento primeiro, quadro depois. Como usar o quadro no dia a dia —
listas, etiquetas, `Ready`, cards UNMAPPED — está em [`trello/README.md`](trello/README.md).

**Nenhum card abaixo está autorizado a virar código.** Autorizar implementação é ato separado do
Founder/PMO.

> **As etapas mudaram em 06/08/2026 (DL-028).** A sequência vigente está em
> [`../product/ROADMAP-MVP-V2.md`](../product/ROADMAP-MVP-V2.md) §3 e §4, com duas trilhas. Os
> quatro cards de DESIGN que carregavam a etapa antiga foram atualizados **no campo `Etapa` e
> só nele** — objetivo, aceite, gate, fora de escopo e evidência de cada um continuam
> exatamente como estavam:
>
> | Card          | Etapa antiga | Etapa vigente |
> | ------------- | ------------ | ------------- |
> | MVP-DESIGN-01 | R3           | **R4**        |
> | MVP-DESIGN-02 | R3           | **R5**        |
> | MVP-DESIGN-03 | R6           | **R3.2**      |
> | MVP-DESIGN-05 | R4           | **R3.3**      |

---

## Listas

| #   | Lista                  | Entra quando                                       | Sai quando                    |
| --- | ---------------------- | -------------------------------------------------- | ----------------------------- |
| 1   | **Inbox**              | qualquer ideia ou achado, sem triagem              | o PMO aprova ou descarta      |
| 2   | **Backlog aprovado**   | o PMO aprovou o card, mas faltam dependências      | as dependências fecham        |
| 3   | **Ready**              | dependências fechadas e critério de aceite escrito | alguém começa                 |
| 4   | **Em desenvolvimento** | há branch aberta                                   | há PR aberto                  |
| 5   | **Em revisão técnica** | PR aberto, CI e CodeQL rodando                     | checks verdes e revisão feita |
| 6   | **Revisão do Founder** | checks verdes e evidência anexada                  | o Founder aprova ou devolve   |
| 7   | **Bloqueado**          | falta decisão humana, credencial, gate ou dado     | o bloqueio cai                |
| 8   | **Concluído**          | mergeado e validado                                | nunca                         |

Regra: um card com **gate** só passa de 6 para 8 com registro da autorização em
[`MVP-DECISION-LOG.md`](MVP-DECISION-LOG.md).

## Etiquetas

**Do MVP:** `E1 — Identidade exata` · `E2 — Comparação confiável` · `E3 — Aquisição e retenção` ·
`DATA` · `DESIGN` · `SECURITY` · `BUSINESS` · `DOCS`

**Da trilha pós-MVP:** `POST-MVP` · `CONNECTOR` · `LEGAL` (acumulam com `DATA`, `SECURITY` e
`BUSINESS`)

`SECURITY` acumula com a etiqueta de épico. Todo card com `SECURITY` exige revisão adversarial antes
de sair da lista 5.

**Todo card com `POST-MVP` entra fora de Ready** e assim permanece até o Gate de necessidade
(PM-DATA-0) ser aprovado. Ver §"Trilha pós-MVP".

---

## E1 — Identidade exata do produto

### MVP-E1-01 — Quantidade e unidade estruturadas

- **Objetivo:** substituir `size_text` como fonte de cálculo por `quantity_value` + `quantity_unit`.
- **Fonte:** `docs/data/MVP-DATA-CONTRACT.md` §1–2
- **Dependências:** MVP-DATA-01 · **Etapa:** R1 · **Etiquetas:** E1, DATA
- **Aceite:** as cinco unidades aceitas; normalizada derivada; `size_text` preservado só como texto
  de exibição; migration criada e **não aplicada**.
- **Gate:** aplicar a migration.
- **Fora de escopo:** preço unitário (E1-06), imagens, promoções.
- **Evidência:** migration + testes de conversão + drill de schema verde.

### MVP-E1-02 — `package_type` como campo de identidade

- **Objetivo:** distinguir unidade, pack, kit, garrafa, lata, vidro, sachê e caixa.
- **Fonte:** `docs/product/CANONICAL-PRODUCT-SPEC.md` §4.6
- **Dependências:** MVP-E1-01 · **Etapa:** R1 · **Etiquetas:** E1, DATA
- **Aceite:** embalagens diferentes produzem SKUs diferentes; teste com vidro × sachê × lata.
- **Gate:** aplicar a migration.
- **Fora de escopo:** exibição do tipo no card (fica em DESIGN-03).
- **Evidência:** teste de equivalência.

### MVP-E1-03 — Regras EXATO / OUTRO TAMANHO / SIMILAR

- **Objetivo:** função pura que classifica a relação entre dois SKUs.
- **Fonte:** `docs/product/CANONICAL-PRODUCT-SPEC.md` §3–4
- **Dependências:** MVP-E1-01, MVP-E1-02 · **Etapa:** R1 · **Etiquetas:** E1
- **Aceite:** os seis casos de D6 cobertos por teste; **nenhum** SIMILAR entra na lista orgânica em
  nenhum caminho de código.
- **Gate:** nenhum.
- **Fora de escopo:** interface das seções (E2-04).
- **Evidência:** `src/lib/equivalence.test.ts` verde.

### MVP-E1-04 — Aliases de busca

- **Objetivo:** aliases curados entram no texto de busca.
- **Fonte:** `docs/product/CANONICAL-PRODUCT-SPEC.md` §5
- **Dependências:** MVP-DATA-01 · **Etapa:** R2 · **Etiquetas:** E1, DATA
- **Aceite:** alias nunca vira identidade; nunca aparece como nome; nunca é inferido
  automaticamente.
- **Gate:** aplicar a migration.
- **Fora de escopo:** autocomplete.
- **Evidência:** teste de busca por alias + migration não aplicada.

### MVP-E1-05 — Contrato e validação de GTIN

- **Objetivo:** validar comprimento e dígito verificador; decidir a unicidade sob reformulação.
- **Fonte:** `docs/data/PRODUCT-IDENTIFIERS.md` §3–4
- **Dependências:** MVP-E1-01 · **Etapa:** R1 · **Etiquetas:** E1, DATA
- **Aceite:** zeros à esquerda preservados; GTIN inválido rejeitado na escrita; **nada no código
  assume que GTIN é a chave de produto**; a escolha entre as opções (a) e (b) de §4 registrada.
- **Gate:** aplicar a migration de índice.
- **Fora de escopo:** tabela `product_identifiers`.
- **Evidência:** testes com os vetores de GTIN.

### MVP-E1-06 — Preço unitário calculado

- **Objetivo:** unitário derivado, com `calculation_status`.
- **Fonte:** `docs/data/MVP-DATA-CONTRACT.md` §2
- **Dependências:** MVP-E1-01 · **Etapa:** R2 · **Etiquetas:** E1
- **Aceite:** **nunca armazenado**; nunca exibido fora de `ok`; nunca compara grandezas diferentes;
  nunca ordena a lista orgânica.
- **Gate:** nenhum.
- **Fora de escopo:** peso variável.
- **Evidência:** testes dos onze casos da tabela de §2.

### MVP-E1-07 — Campos e curadoria de imagem

- **Objetivo:** os sete campos, revisão manual e `image_variant_match`.
- **Fonte:** `docs/data/IMAGE-POLICY.md`
- **Dependências:** MVP-E1-01 · **Etapa:** R7 · **Etiquetas:** E1, DATA, SECURITY
- **Aceite:** só `approved` + `exact` renderiza imagem; qualquer outra combinação renderiza
  placeholder; **CSP não alterado neste card**.
- **Gate:** aplicar a migration; alterar o CSP é gate separado.
- **Fora de escopo:** importação por GTIN; alteração de CSP.
- **Evidência:** teste provando que `size_variant` não renderiza imagem.

### MVP-E1-08 — Backfill de `size_text` com revisão manual

- **Objetivo:** converter o texto existente em quantidade estruturada.
- **Fonte:** `docs/pmo/MVP-EXECUTION-PLAN.md` R1–R2
- **Dependências:** MVP-E1-01 · **Etapa:** R2 · **Etiquetas:** E1, DATA
- **Aceite:** cada conversão conferida **linha a linha**; ambiguidade vira `unavailable`, nunca
  chute; relatório anexado ao PR.
- **Gate:** **sim** — o Founder revisa o relatório antes da aplicação.
- **Fora de escopo:** conversão automática sem revisão.
- **Evidência:** relatório de conversão com uma linha por produto.

---

## E2 — Comparação confiável

### MVP-E2-01 — Desempate determinístico ✅ _(esta rodada)_

- **Objetivo:** terceiro critério estável na ordenação.
- **Fonte:** `docs/product/COMPARISON-SPEC.md` §4 · TD-002
- **Dependências:** nenhuma · **Etapa:** R0.5 · **Etiquetas:** E2
- **Aceite:** ordem idêntica em execuções repetidas com preço e `observed_at` iguais; preço
  crescente e recência preservados; destaque, pagamento e mercado habitual sem influência.
- **Gate:** merge.
- **Fora de escopo:** tudo o mais.
- **Evidência:** PR `fix/comparison-deterministic-tiebreaker`, CI e CodeQL verdes.

### MVP-E2-02 — Busca na primeira dobra

- **Objetivo:** subir a busca para a primeira dobra da Home (D2).
- **Fonte:** `docs/product/ROADMAP-MVP-v3.md` E2.1 · D2
- **Dependências:** MVP-DATA-06, MVP-DESIGN-05 · **Etapa:** R4 · **Etiquetas:** E2, DESIGN
- **Aceite:** busca visível sem rolagem em 360 px; HTML inicial continua sem estado de carregamento;
  Achados continuam servidos pelo loader.
- **Gate:** revisão do Founder — muda a Home.
- **Fora de escopo:** autocomplete.
- **Evidência:** captura em 360 px e em desktop; `index.ssr.test.ts` atualizado.

### MVP-E2-03 — Busca por relevância, aliases e similaridade

- **Objetivo:** GTIN exato, AND de substrings com aliases, fallback por similaridade (TD-007).
- **Fonte:** `docs/product/COMPARISON-SPEC.md` §5
- **Dependências:** MVP-E1-04, MVP-DATA-01 · **Etapa:** R4 · **Etiquetas:** E2, DATA
- **Aceite:** sugestão por similaridade **rotulada** e nunca misturada ao exato; ordenação por
  relevância documentada e testada.
- **Gate:** nenhum.
- **Fora de escopo:** autocomplete; busca semântica.
- **Evidência:** testes com termo exato, com erro de digitação e com GTIN.

### MVP-E2-04 — Três blocos de resultado

- **Objetivo:** exato, outro tamanho e similar visualmente separados e rotulados.
- **Fonte:** `docs/product/CANONICAL-PRODUCT-SPEC.md` §3
- **Dependências:** MVP-E1-03 · **Etapa:** R4 · **Etiquetas:** E2, DESIGN
- **Aceite:** **nenhuma comparação numérica** entre similares; outro tamanho comparado só por
  unitário; rótulos explícitos, não só espaçamento.
- **Gate:** revisão do Founder.
- **Fora de escopo:** ordenação entre blocos.
- **Evidência:** teste de que similar não recebe diferença de preço calculada.

### MVP-E2-05 — CTA "Comparar em X mercados"

- **Objetivo:** rótulo com contagem real.
- **Fonte:** `docs/product/COMPARISON-SPEC.md` §6
- **Dependências:** MVP-DATA-04 · **Etapa:** R5 · **Etiquetas:** E2
- **Aceite:** com 1 mercado o rótulo muda; com 0 o card não aparece; a contagem usa só ofertas
  vigentes.
- **Gate:** nenhum.
- **Fora de escopo:** contagem de similares.
- **Evidência:** testes dos três casos.

### MVP-E2-06 — Preço unitário e outro tamanho na comparação

- **Objetivo:** seção de outro tamanho comparada por unitário.
- **Fonte:** `docs/product/COMPARISON-SPEC.md` §2
- **Dependências:** MVP-E1-06, MVP-E2-04 · **Etapa:** R5 · **Etiquetas:** E2
- **Aceite:** unitário nunca ordena a lista orgânica; ausência de unitário não quebra a seção.
- **Gate:** nenhum.
- **Fora de escopo:** peso variável.
- **Evidência:** teste com 900 ml × 1 L.

### MVP-E2-07 — Promoções tipificadas

- **Objetivo:** os quatro tipos, com validação server-side.
- **Fonte:** `docs/data/PROMOTION-TYPES.md`
- **Dependências:** MVP-E1-06 · **Etapa:** R7 · **Etiquetas:** E2, DATA
- **Aceite:** promoção **não** reordena a lista; preço efetivo nunca aparece sem a condição e a
  quantidade; `promotion_params` inválido é tratado como ausência; `special_condition` preservado e
  sem papel computável.
- **Gate:** aplicar a migration.
- **Fora de escopo:** tipos além dos quatro.
- **Evidência:** teste provando que a ordem não muda com promoção.

### MVP-E2-08 — Estados da oferta e leitura pública controlada

- **Objetivo:** os seis estados, superfície de leitura própria, janela de 24 h configurável.
- **Fonte:** `docs/data/OFFER-STATES.md`
- **Dependências:** MVP-DATA-05; **P-05 resolvida** · **Etapa:** R8 · **Etiquetas:** E2, DATA, SECURITY
- **Aceite:** a policy pública de `prices` **não** é ampliada; a superfície nunca devolve
  `source_reference`, `is_featured` nem `is_demo`; `corrected` e `removed` nunca saem; oferta não
  vigente nunca entra em `latestValidPricePerMarket()`; `isValidPrice()` e o banco concordam.
- **Gate:** **sim, próprio** — mudança do contrato público de leitura.
- **Fora de escopo:** analytics (E3-01).
- **Evidência:** revisão adversarial "consigo fazer um preço não vigente aparecer como menor
  preço?"; drill de schema verde; os dez testes de `OFFER-STATES.md` §5.

### MVP-E2-09 — Preço anterior rastreável

- **Objetivo:** derivar preço anterior de observação real.
- **Fonte:** `docs/data/OFFER-STATES.md` §5
- **Dependências:** MVP-E2-08; **P-01 resolvida** · **Etapa:** R8 · **Etiquetas:** E2
- **Aceite:** nunca de outro mercado; nunca de registro `corrected`/`removed`; ausência não exibe
  nada; percentual < 1% não é exibido; nunca aparece sem a data.
- **Gate:** o mesmo de E2-08.
- **Fora de escopo:** série histórica, gráfico.
- **Evidência:** os testes 1–6 de `OFFER-STATES.md` §5.

### MVP-E2-10 — `og:image` e compartilhamento da comparação

- **Objetivo:** prévia própria e botão de compartilhar na comparação (TD-006).
- **Fonte:** `docs/product/COMPARISON-SPEC.md` §8
- **Dependências:** nenhuma — a rota está decidida (D8/DL-014): `/produto/$productId` ·
  **Etapa:** R5 · **Etiquetas:** E2, DESIGN
- **Aceite:** prévia estática; em DEMO o texto compartilhado continua começando pelo aviso de
  exemplo fictício; sem gerador dinâmico.
- **Gate:** nenhum.
- **Fora de escopo:** imagem por oferta.
- **Evidência:** teste de metadados + prévia conferida.

---

## E3 — Aquisição e retenção

### MVP-E3-01 — Endpoint first-party de eventos

- **Objetivo:** endpoint no Worker, validação server-side, lista fechada.
- **Fonte:** `docs/analytics/MVP-EVENT-TAXONOMY.md` §1
- **Dependências:** **P-02 resolvida** · **Etapa:** R8 · **Etiquetas:** E3, SECURITY
- **Aceite:** evento fora da lista é **rejeitado**; nenhuma escrita em tabela de negócio; nenhum
  campo proibido aceito; teste de bypass; proteção anti-abuso.
- **Gate:** **sim, próprio** — superfície de escrita nova, rito da Onda 3.
- **Fora de escopo:** ferramenta de terceiro; SDK.
- **Evidência:** revisão adversarial; teste de payload malicioso.

### MVP-E3-02 — Instrumentação dos doze eventos

- **Objetivo:** disparar os eventos nos pontos certos.
- **Fonte:** `docs/analytics/MVP-EVENT-TAXONOMY.md` §2
- **Dependências:** MVP-E3-01 · **Etapa:** R8 · **Etiquetas:** E3
- **Aceite:** `discovery_mode` distingue `finding_discovery` de `intentional_search`; nenhum termo de
  busca em texto; sessão efêmera, sem cookie e sem armazenamento.
- **Gate:** o mesmo de E3-01.
- **Fora de escopo:** opt-in (não existe).
- **Evidência:** teste que falha se um payload proibido for montado.

### MVP-E3-03 — Dashboard mínimo do piloto

- **Objetivo:** os sete números semanais.
- **Fonte:** `docs/analytics/MVP-EVENT-TAXONOMY.md` §5
- **Dependências:** MVP-E3-02 · **Etapa:** R9 · **Etiquetas:** E3, BUSINESS
- **Aceite:** uma consulta, sem ferramenta nova, sem painel.
- **Gate:** nenhum.
- **Fora de escopo:** BI, painel, gráfico em tempo real.
- **Evidência:** consulta versionada + exemplo de saída sintética.

### MVP-E3-04 — Spike de tecnologia de armazenamento

- **Objetivo:** resolver P-02 com dado, não com opinião.
- **Fonte:** `docs/analytics/MVP-EVENT-TAXONOMY.md` §4
- **Dependências:** nenhuma · **Etapa:** antes de R8 · **Etiquetas:** E3, DOCS, SECURITY
- **Aceite:** as três alternativas medidas em volume, custo, retenção e esforço de leitura;
  recomendação escrita; **nada instalado**.
- **Gate:** **sim** — a escolha é do Founder/PMO.
- **Fora de escopo:** implementar a escolhida.
- **Evidência:** ADR atualizada com a decisão.

---

## DATA

### MVP-DATA-01 — Contrato único de normalização ✅ _(esta rodada)_

- **Objetivo:** alinhar `pa_normalize_text()` e `normalizeSearchText()` (TD-001A; TD-001B segue
  aberta).
- **Fonte:** `docs/data/PRODUCT-IDENTIFIERS.md` §2
- **Dependências:** nenhuma · **Etapa:** R0.5 · **Etiquetas:** DATA
- **Aceite:** os dezesseis vetores idênticos nos dois lados; migration **criada e não aplicada**;
  rollback documentado; nenhum produto unido automaticamente.
- **Gate:** aplicar a migration.
- **Fora de escopo:** quantidade estruturada; união de duplicatas.
- **Evidência:** PR `fix/product-normalization-contract`, CI e CodeQL verdes.

### MVP-DATA-02 — Relatório de colisões e decisão humana

- **Objetivo:** rodar o script read-only nos ambientes e decidir o que fazer com o que aparecer.
- **Fonte:** `docs/data/PRODUCT-IDENTIFIERS.md` §5–6
- **Dependências:** MVP-DATA-01 · **Etapa:** antes de aplicar a migration · **Etiquetas:** DATA
- **Aceite:** relatório vazio libera a aplicação; relatório não vazio é **HUMAN ACTION REQUIRED** —
  unir ou excluir produto é decisão do Founder/PMO, nunca do CTO.
- **Gate:** **sim.**
- **Fora de escopo:** qualquer escrita.
- **Evidência:** saída do script anexada.

### MVP-DATA-03 — `markets.city` no contrato

- **Objetivo:** TD-003 · D12.
- **Fonte:** `docs/pmo/TECHNICAL-DEBT-REGISTER.md` TD-003
- **Dependências:** nenhuma · **Etapa:** R2 · **Etiquetas:** DATA
- **Aceite:** cidade no tipo, no serviço e onde o mercado é identificado; **coluna não removida**.
- **Gate:** nenhum.
- **Fora de escopo:** expansão para Piracicaba.
- **Evidência:** teste de que a cidade aparece na comparação.

### MVP-DATA-04 — `limit` em `getProductsPriceStats`

- **Objetivo:** TD-004.
- **Fonte:** `docs/pmo/TECHNICAL-DEBT-REGISTER.md` TD-004
- **Dependências:** nenhuma · **Etapa:** R4 · **Etiquetas:** DATA
- **Aceite:** consulta com teto explícito; comportamento inalterado no volume atual.
- **Gate:** nenhum.
- **Fora de escopo:** cache distribuído.
- **Evidência:** teste com muitos mercados sintéticos.

### MVP-DATA-05 — `price_events` e trilha de auditoria

- **Objetivo:** histórico append-only das transições de estado.
- **Fonte:** `docs/data/OFFER-STATES.md` §4
- **Dependências:** nenhuma · **Etapa:** R8 · **Etiquetas:** DATA, SECURITY
- **Aceite:** sem dado pessoal; leitura só por `service_role`; **não** é superfície pública.
- **Gate:** aplicar a migration.
- **Fora de escopo:** interface de auditoria.
- **Evidência:** teste de que `anon` não lê a tabela.

### MVP-DATA-06 — Contrato único de catálogo com adapters

- **Objetivo:** D1 — uma interface, dois adapters.
- **Fonte:** `docs/data/MVP-DATA-CONTRACT.md` §5
- **Dependências:** nenhuma · **Etapa:** R4 · **Etiquetas:** DATA
- **Aceite:** em DEMO o caminho do Supabase **não é avaliado**; nenhum componente consulta dados
  diretamente; `generatedAt` continua vindo do servidor; falha do Supabase não derruba a Home.
- **Gate:** nenhum.
- **Fora de escopo:** mudar a fonte de dado da demonstração.
- **Evidência:** `index.demo-source.test.ts` continua verde.

---

## DESIGN

### MVP-DESIGN-01 — Protótipo da busca em três blocos

- **Objetivo:** desenhar antes de implementar. · **Fonte:** `MVP-EXECUTION-PLAN.md` R3
- **Dependências:** MVP-E1-03 · **Etapa:** R4 _(era R3; DL-028)_ · **Etiquetas:** DESIGN, E2
- **Aceite:** rota de desenvolvimento, dados do fixture, nenhum schema.
- **Gate:** **sim** — o Founder decide antes da implementação.
- **Fora de escopo:** produção. · **Evidência:** capturas em 360 px e desktop.

### MVP-DESIGN-02 — Protótipo da comparação com unitário e estados

- **Objetivo:** idem, para a comparação. · **Fonte:** `MVP-EXECUTION-PLAN.md` R3
- **Dependências:** MVP-E1-06 · **Etapa:** R5 _(era R3; DL-028)_ · **Etiquetas:** DESIGN, E2
- **Aceite:** as três seções, os quatro estados públicos, unitário ausente sem quebrar.
- **Gate:** **sim.** · **Fora de escopo:** produção. · **Evidência:** capturas.

### MVP-DESIGN-03 — Card v2, anatomia dos 17 itens

- **Objetivo:** evoluir o `AchadoCard`. · **Fonte:** `docs/product/CARD-V2-SPEC.md`
- **Dependências:** MVP-DESIGN-02 · **Etapa:** R3.2 _(era R6; DL-028)_ · **Etiquetas:** DESIGN, E2
- **Aceite:** as regras de "o que o card não faz" preservadas e testadas; alvo de toque ≥ 48 px;
  preço fora da árvore de acessibilidade com `spokenPrice()`; variação percentual com rótulo textual.
- **Gate:** **sim** — é a peça que o Founder mostra.
- **Fora de escopo:** gerador de imagem por oferta. · **Evidência:** capturas + testes de contrato.

### MVP-DESIGN-04 — Placeholder por categoria

- **Objetivo:** SVG por categoria, no próprio domínio. · **Fonte:** `docs/data/IMAGE-POLICY.md` §5
- **Dependências:** nenhuma · **Etapa:** R7 · **Etiquetas:** DESIGN, E1
- **Aceite:** mesmo aspect ratio da imagem real; decorativo (`alt=""`, `aria-hidden`); dentro do CSP
  atual. · **Gate:** nenhum. · **Fora de escopo:** ilustração por produto.
- **Evidência:** captura com e sem imagem, lado a lado.

### MVP-DESIGN-05 — Nova ordem da Home

- **Objetivo:** reordenar com a busca na primeira dobra (D2).
- **Fonte:** `docs/product/ROADMAP-MVP-v3.md` E2.1
- **Dependências:** MVP-DESIGN-01 · **Etapa:** R3.3 _(era R4; DL-028)_ · **Etiquetas:** DESIGN, E2
- **Aceite:** Achados continuam presentes e servidos pelo loader; CTA fixo do mobile continua com
  anti-duplicação; nenhum carregamento no HTML inicial.
- **Gate:** **sim.** · **Fora de escopo:** rodapé novo.
- **Evidência:** capturas + `index.ssr.test.ts`.

---

## BUSINESS

### MVP-BUSINESS-01 — Sprint de entrevistas com mercados de Artemis

- **Status:** materiais prontos; **campo não iniciado**. _(O rótulo "PAUSADO PARA PLANO DE
  DELEGAÇÃO" foi removido em 06/08/2026: o plano existe. O gate de contato externo **continua
  fechado** — DL-031.)_
- **Objetivo:** mapear sobreposição de produtos entre mercados, disponibilidade de GTIN, capacidade
  real de envio de ofertas, formatos de promoção praticados, como correções e esgotamentos são
  comunicados hoje, e aceitação da ideia de comparação pública de preço.
- **Fonte:** `docs/business/interviews/` · `docs/mvp/TEST-MVP-PLAN.md` Gate V2 · `PLANO-MESTRE.md` §11
- **Dependências:** autorização específica do Founder para contato externo
- **Etapa:** **B2B-1** · **Etiquetas:** BUSINESS
- **Aceite:** plano de delegação escrito antes de qualquer contato; nenhum dado pessoal coletado sem
  base definida; nenhum compromisso comercial assumido em campo.
- **Gate:** **sim** — contato com pessoa real exige autorização específica.
- **Fora de escopo:** cadastro de dado real; promessa de publicação; cashback.
- **Evidência:** plano de delegação + roteiro de entrevista, ambos revisados antes de ir a campo.
- **Checklist:**
  1. página para mercados revisada
  2. pitch preparado
  3. roteiro preparado
  4. template de entrevista
  5. hipóteses definidas
  6. critérios de sucesso definidos
  7. material offline
  8. QR Code quando houver URL
  9. entrevistas realizadas
  10. síntese concluída
  11. próximos passos registrados

Os itens 1 a 7 são trabalho do CTO e estão entregues. **Os itens 8 a 11 não podem ser iniciados
por mim:** o QR Code depende de uma URL estável e aprovada, que não existe antes de R8, e os três
últimos dependem de conversas com pessoas reais.

### MVP-BUSINESS-02 — Script versionado de publicação de oferta

- **Objetivo:** substituir SQL escrito à mão no editor do Supabase por arquivo validado.
- **Fonte:** `docs/pmo/MVP-EXECUTION-PLAN.md` R9
- **Dependências:** MVP-E1-01 · **Etapa:** R9 · **Etiquetas:** BUSINESS, DATA, SECURITY
- **Aceite:** entrada versionada → validação → escrita; recusa entrada incompleta; **precisa existir
  antes de qualquer dado real**.
- **Gate:** **sim** — é ferramenta de escrita.
- **Fora de escopo:** painel administrativo.
- **Evidência:** execução contra dado sintético, com saída anexada.

### MVP-BUSINESS-03 — Curadoria de imagem na operação manual

- **Objetivo:** incorporar o checklist de imagem ao fluxo do Founder.
- **Fonte:** `docs/data/IMAGE-POLICY.md` §4
- **Dependências:** MVP-E1-07 · **Etapa:** R7 · **Etiquetas:** BUSINESS, DOCS
- **Aceite:** os cinco itens do checklist no documento de operação; reprovação → placeholder.
- **Gate:** nenhum. · **Fora de escopo:** ferramenta de curadoria.
- **Evidência:** `MANUAL-OFFER-OPERATIONS.md` atualizado.

### MVP-BUSINESS-04 — `/para-mercados` como apoio à entrevista (B2B-0) _(card novo, 06/08/2026)_

- **Objetivo:** a rota `/para-mercados` deixa de ser página de venda e passa a apoiar a conversa:
  explica o piloto, mostra como o consumidor encontra o mercado, e pede uma conversa — não um
  contrato. · **Fonte:** `docs/product/ROADMAP-MVP-V2.md` §4 · `docs/mvp/FOR-MARKETS-PAGE.md`
- **Dependências:** nenhuma · **Etapa:** **B2B-0** · **Etiquetas:** BUSINESS, DESIGN
- **Aceite:** neutralidade escrita na página ("participar não compra posição no ranking");
  nenhuma promessa de venda, tráfego ou métrica; nenhum telefone pessoal no código público;
  nenhum logotipo de mercado; alvo de toque ≥ 48 px; funcional a partir de 320 px.
- **Gate:** **sim** — revisão visual do Founder antes do merge.
- **Fora de escopo:** painel do lojista, login, upload de planilha, integração com ERP,
  destaque patrocinado, contrato, pagamento — todos em B2B-5 ou fora do MVP.
- **Evidência:** capturas em 390, 430 e desktop, mais painel comparativo; testes de contrato da
  rota.

**Este card é novo.** Ele não existia no quadro e não substitui nenhum outro — a rota
`/para-mercados` foi construída na Parte 3 sem card próprio, e B2B-0 é a primeira etapa que a
trata como entregável com gate. Nenhum ID existente foi reutilizado nem reinterpretado.

---

## DOCS

### MVP-DOCS-01 — Consolidação do roadmap v3 ✅ _(esta rodada)_

- **Objetivo:** roadmap v3 como fonte oficial. · **Fonte:** mandato R0.5
- **Dependências:** nenhuma · **Etapa:** R0.5 · **Etiquetas:** DOCS
- **Aceite:** documentos criados; conflitos marcados como superseded no ponto exato; nenhum código
  funcional no PR. · **Gate:** revisão do Founder.
- **Evidência:** PR `docs/mvp-roadmap-v3-source-of-truth`.

### MVP-DOCS-02 — Decidir P-01 (janela do preço anterior)

- **Objetivo:** fixar a janela de seleção da observação anterior.
- **Fonte:** `docs/data/OFFER-STATES.md` §5 · **Bloqueia:** R8, MVP-E2-09
- **Etiquetas:** DOCS · **Gate:** **sim.** · **Evidência:** entrada no decision log.

### MVP-DOCS-03 — Decidir P-03 (rota da comparação) ✅ _(resolvida em 03/08/2026)_

- **Decisão:** a rota canônica permanece `/produto/$productId`. Nenhuma rota nova, nenhum redirect,
  nenhum alias. O CTA passa a ser "Comparar em X mercados" e leva à mesma rota.
- **Fonte:** `MVP-DECISION-LOG.md` D8 e DL-014 · **Desbloqueou:** R5, MVP-E2-10, TD-008
- **Etiquetas:** DOCS · **Evidência:** entrada no decision log e `COMPARISON-SPEC.md` §1.1.

### MVP-DOCS-04 — Decidir P-04 (Dependabot) ✅ _(resolvida em 03/08/2026)_

- **Decisão:** política escrita em [`DEPENDENCY-POLICY.md`](DEPENDENCY-POLICY.md), com inventário
  somente leitura dos seis PRs. Nenhum auto-merge, major sempre em PR próprio, CI vermelho proíbe
  merge, lockfile inesperado exige investigação.
- **Fonte:** `MVP-DECISION-LOG.md` D10 e DL-015 · **Desbloqueou:** higiene de CI
- **Etiquetas:** DOCS · **Evidência:** política + inventário dos seis PRs.
- **Atenção:** a política **não autoriza** merge de nenhum dos seis. Cada um continua sendo gate
  humano próprio.

### MVP-DOCS-05 — Decidir P-05 (configuração do prazo de 24 h)

- **Objetivo:** onde vive a configuração do prazo de visibilidade de oferta não ativa.
- **Fonte:** `docs/data/OFFER-STATES.md` §2 · **Bloqueia:** R8, MVP-E2-08
- **Etiquetas:** DOCS · **Gate:** **sim.** · **Evidência:** entrada no decision log.

### MVP-DOCS-06 — Atualizar a operação manual para o v3

- **Objetivo:** imagem, promoção estruturada e estados no fluxo manual.
- **Fonte:** `docs/mvp/MANUAL-OFFER-OPERATIONS.md`
- **Dependências:** MVP-E1-07, MVP-E2-07, MVP-E2-08 · **Etapa:** R9 · **Etiquetas:** DOCS, BUSINESS
- **Aceite:** os dez passos do fluxo com campo obrigatório, evidência e responsável.
- **Gate:** nenhum. · **Evidência:** documento atualizado.

### MVP-DOCS-07 — Tornar o `db-schema-drill` required check da `main` — **CONCLUÍDO em 04/08/2026**

- **Objetivo:** o drill reconstrói o schema do zero contra Postgres vivo, mas **não** era required
  check — nada impedia um merge de migration com ele vermelho, além de conferência manual.
- **Fonte:** `docs/evidence/r2/branch-protection.md` · **Decisão:** DL-022, concluído por DL-023
  · **Origem:** R2.2 §2 e §15 · **Resolvido em:** R2.3 §2 e §3
- **Etapa:** fora da sequência R · **Etiquetas:** DOCS, SECURITY
- **Por que não foi resolvido em R2.2:** o workflow era filtrado por caminho, e required check que
  não é reportado deixa todo PR documental pendente para sempre. Medido nos PRs #58 (drill
  presente), #48 e #60 (ausente). A correção completa precisava mexer no workflow.
- **Como foi resolvido:** PR [#62](https://github.com/samuel3ssilva/vipreco/pull/62) tirou o filtro
  `paths:` e separou o workflow em detector, drill pesado e um gate que **sempre reporta**. O
  required check passou a ser `db-schema-drill-required` — o gate —, não o drill.
- **Aceite — verificado:** os dois checks anteriores preservados; `strict=true` preservado; nenhuma
  proteção removida ou relaxada; `enforce_admins` intocado; os dois estados da proteção comparados
  campo a campo, e **só a lista de checks mudou**, por acréscimo.
- **Gate:** cumprido. · **Evidência:** `docs/evidence/r2/branch-protection.md` §1 e §5 — proteção
  relida depois da mudança, e um PR de cada tipo conferido, com o log do gate lido (e não só o ✅:
  passar pelo motivo certo e pelo motivo errado têm a mesma aparência na lista de checks).

---

## Trilha pós-MVP — automação complementar de ingestão

**Todos os catorze cards abaixo entram no quadro em `Inbox` ou `Bloqueado` — nunca em `Ready`.**

Não fazem parte do MVP, não bloqueiam o MVP, não podem começar autonomamente, e cada um depende de
Gate humano. Nenhuma investigação autoriza publicação, e nenhum preço coletado entra no produto
nesta fase.

**Dois estudos técnicos anteriores são relatados pelo Founder/PMO e não foram localizados nesta
missão** — registro completo em
[`../post-mvp/SOURCE-CONNECTOR-STATUS.md`](../post-mvp/SOURCE-CONNECTOR-STATUS.md) §4. O quadro
**não** afirma que investigação anterior nunca existiu; PM-DATA-02 existe justamente para
localizá-la.

**Contratos que estes cards consomem** — todos fora do MVP, todos sem schema:

| Assunto                          | Documento normativo                                                          |
| -------------------------------- | ---------------------------------------------------------------------------- |
| alias de produto por fonte       | [`../data/SOURCE-PRODUCT-ALIASES.md`](../data/SOURCE-PRODUCT-ALIASES.md)     |
| tipo de preço, canal e condição  | [`../data/PRICE-CONDITION-TAXONOMY.md`](../data/PRICE-CONDITION-TAXONOMY.md) |
| protocolo e índice de evidências | [`../evidence/price-sources/README.md`](../evidence/price-sources/README.md) |

Contexto e sequência em
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md).

Etiquetas comuns a todos: `POST-MVP`. As demais estão em cada linha.

| ID             | Título                                         | Etapa     | Etiquetas extras    | Lista inicial |
| -------------- | ---------------------------------------------- | --------- | ------------------- | ------------- |
| **PM-DATA-01** | Medir déficit de cobertura                     | PM-DATA-0 | DATA, BUSINESS      | Inbox         |
| **PM-DATA-02** | Localizar e preservar investigações anteriores | PM-DATA-0 | DOCS                | Inbox         |
| **PM-DATA-03** | Revisão jurídica e de fontes                   | PM-DATA-1 | LEGAL               | **Bloqueado** |
| **PM-DATA-04** | Definir contrato de conector                   | PM-DATA-1 | CONNECTOR, DATA     | **Bloqueado** |
| **PM-DATA-05** | Atacadão em shadow mode                        | PM-DATA-2 | CONNECTOR, SECURITY | **Bloqueado** |
| **PM-DATA-06** | Auditar precisão composta do Atacadão          | PM-DATA-3 | CONNECTOR, DATA     | **Bloqueado** |
| **PM-DATA-07** | Provar regionalização do Savegnago             | PM-DATA-5 | CONNECTOR           | **Bloqueado** |
| **PM-DATA-08** | Provar canais e condições do Pague Menos       | PM-DATA-5 | CONNECTOR           | **Bloqueado** |
| **PM-DATA-09** | Reavaliar São Vicente                          | PM-DATA-5 | CONNECTOR           | **Bloqueado** |
| **PM-DATA-10** | Implementar fila de revisão                    | PM-DATA-3 | DATA, BUSINESS      | **Bloqueado** |
| **PM-DATA-11** | Gate de publicação limitada                    | PM-DATA-4 | SECURITY, BUSINESS  | **Bloqueado** |
| **PM-DATA-12** | Agendamento e observabilidade                  | PM-DATA-6 | CONNECTOR, SECURITY | **Bloqueado** |
| **PM-DATA-13** | Expansão Santa Terezinha                       | PM-DATA-7 | BUSINESS            | **Bloqueado** |
| **PM-DATA-14** | Reavaliar fontes em HOLD                       | —         | LEGAL, BUSINESS     | **Bloqueado** |

### Detalhamento

**PM-DATA-01 — Medir déficit de cobertura.** Medir quantos produtos canônicos têm preço vigente em
dois ou mais mercados pelo caminho manual. **Aceite:** medida real, não estimativa; 20 produtos
comparáveis como referência inicial do piloto, **não** como regra permanente. **Gate:** o resultado
alimenta PM-DATA-0 e o limiar definitivo é do PMO. **Fora de escopo:** qualquer conector.

**PM-DATA-02 — Localizar e preservar investigações anteriores.** O Founder/PMO relata **[F]** que
dois estudos foram produzidos: um plano técnico sobre Pague Menos, São Vicente e Carrefour
(`plano-coleta-automatica-ofertas.md`) e uma investigação complementar sobre Savegnago e Atacadão
(`investigacao-savegnago-atacadao.md`). Nenhum dos dois foi localizado nesta missão — ver
`../post-mvp/SOURCE-CONNECTOR-STATUS.md` §4 para os caminhos inspecionados. **Onde eles entram
quando forem localizados:**
[`../evidence/price-sources/README.md`](../evidence/price-sources/README.md) §10, sujeitos ao
protocolo de metadados (§4), reprodução (§5) e expiração (§7) daquele índice. **Aceite:** os
relatórios **localizados, versionados ou substituídos por evidência reproduzível**, com o bloco de
metadados preenchido; enquanto isso não acontecer, os achados por fonte permanecem **[H]** e nenhum
spike pós-MVP começa. Manter registrado o que já se sabe, **sem acrescentar investigação nova**.
**Gate:** nenhum para localizar e versionar; **sim** para qualquer acesso a fonte. **Fora de
escopo:** refazer as investigações, acessar as fontes, reconstruir os relatórios por suposição.
**Também rastreado como TD-009.**

**PM-DATA-03 — Revisão jurídica e de fontes.** Ler termos de uso e obter parecer, por fonte.
**Aceite:** parecer escrito antes de qualquer acesso automatizado. **Gate:** **sim** — autorização
por fonte, ou HOLD. **Fora de escopo:** aceitar qualquer termo em nome do ViPreço.

**PM-DATA-04 — Definir contrato de conector.** Interface comum: o que um conector entrega, com
quais campos obrigatórios e qual classe de evidência. **Fonte:**
[`../data/SOURCE-PRODUCT-ALIASES.md`](../data/SOURCE-PRODUCT-ALIASES.md) (alias por fonte, estados
e regras) e [`../data/PRICE-CONDITION-TAXONOMY.md`](../data/PRICE-CONDITION-TAXONOMY.md) (tipo de
preço, canal, condição, escopo). **Aceite:** contrato cobre as catorze dimensões de qualidade, os
cinco estados de alias e as quatro dimensões da taxonomia; critério escrito de "alteração
substancial" na descrição da fonte. **Gate:** **sim.** **Fora de escopo:** implementar conector,
criar tabela, criar migration.

**PM-DATA-05 — Atacadão em shadow mode.** Coletar, guardar, auditar. **Publicar nada.** **Fonte:**
[`../data/PRICE-CONDITION-TAXONOMY.md`](../data/PRICE-CONDITION-TAXONOMY.md) §3, regra 1
(`bulk_price` e `bulk_min_quantity`). **Aceite:** prova de que o conector distingue preço por
unidade de preço por caixa; nenhuma linha publicada. **Gate:** **sim, próprio.** **Fora de escopo:**
publicação, segunda fonte.

**PM-DATA-06 — Auditar precisão composta do Atacadão.** **Aceite:** precisão composta medida sobre
as catorze dimensões; quando houver amostra, também o limite inferior do IC de 95%. **Gate:**
**sim** — o número decide se a trilha continua.

**PM-DATA-07 — Provar regionalização do Savegnago.** **Fonte:**
[`../data/PRICE-CONDITION-TAXONOMY.md`](../data/PRICE-CONDITION-TAXONOMY.md) §2.4 e §3, regra 6.
**Aceite:** demonstrar que preço varia por canal e por unidade e que o conector sabe qual está
lendo — `store_id` e `region_id` resolvidos, não presumidos. Sem isso, nem shadow mode. **Gate:**
**sim.**

**PM-DATA-08 — Provar canais e condições do Pague Menos.** **Fonte:**
[`../data/PRICE-CONDITION-TAXONOMY.md`](../data/PRICE-CONDITION-TAXONOMY.md) §2 e §3.
**Aceite:** separação demonstrada entre online, loja, promoção e Clube Leve Mais — as quatro,
nomeadas no dado, com a condição de acesso registrada. **Gate:** **sim.**

**PM-DATA-09 — Reavaliar São Vicente.** Fallback. **Aceite:** só avança se a regionalização das
anteriores se mostrar instável. **Gate:** **sim.**

**PM-DATA-10 — Implementar fila de revisão.** **Fonte:**
[`../data/SOURCE-PRODUCT-ALIASES.md`](../data/SOURCE-PRODUCT-ALIASES.md) §4 (os cinco estados e as
transições). **Aceite:** item Classe B nunca vira publicado sem decisão humana; alias em
`proposed` ou `needs_review` nunca alimenta conector; **nenhum desfecho automático por
inatividade**. **Gate:** **sim.**

**PM-DATA-11 — Gate de publicação limitada.** **Aceite:** subconjunto pequeno, com procedência de
conector escrita, e reavaliação em prazo definido. **Gate:** **sim, próprio** — é a primeira vez que
dado coletado aparece para o público.

**PM-DATA-12 — Agendamento e observabilidade.** **Aceite:** contagem por classe, detecção de
mudança de formato, idade do dado publicado, alerta quando a execução não roda. **Gate:** **sim.**
Falhar em silêncio é pior do que falhar alto.

**PM-DATA-13 — Expansão Santa Terezinha.** **Aceite:** avaliação de cobertura fora de Artemis, com
dado. **Gate:** **sim.**

**PM-DATA-14 — Reavaliar fontes em HOLD.** Carrefour e Pão de Açúcar. **Aceite:** reavaliação é
decisão do Founder/PMO e **não** decorre de a trilha ter dado certo. **Gate:** **sim.**

---

## Cards já concluídos nesta rodada

| ID          | Onde                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| MVP-DOCS-01 | PR `docs/mvp-roadmap-v3-source-of-truth`                                      |
| MVP-DOCS-03 | decisão D8/DL-014 registrada                                                  |
| MVP-DOCS-04 | decisão D10/DL-015 e `DEPENDENCY-POLICY.md`                                   |
| MVP-E2-01   | PR `fix/comparison-deterministic-tiebreaker`                                  |
| MVP-DATA-01 | PR `fix/product-normalization-contract` — **migration criada e não aplicada** |

Os cinco foram para **Concluído**, com uma exceção deliberada: **MVP-DATA-01 está em `Bloqueado`**.
O PR #47 foi mergeado, mas o **gate do card é aplicar a migration**
`20260803000000_normalization_contract.sql`, e ela não foi aplicada em nenhum ambiente — antes de
aplicar é obrigatório rodar MVP-DATA-02. Um card fecha quando o **gate** fecha, não quando o PR
mergeia.

## Estado do quadro

Sincronizado em 03/08/2026 contra `af624250b159039ac4922f6b0a3de5bfbe3c39e4`:

- **56 cards oficiais**, todos com ID único e com as etiquetas oficiais aplicadas conforme este mapa;
- **20 cards não oficiais** preservados — 9 cards de onda `R0`–`R8` criados manualmente, 7
  cards que o próprio Trello cria ao abrir um quadro, e 4 manuais avulsos. A contagem
  anterior registrava **19** e tratava as três categorias como uma só; a medição
  discriminada de 04/08/2026 está em [`MVP-DECISION-LOG.md`](MVP-DECISION-LOG.md) DL-021;
- **8 listas oficiais** abertas; `Em desenvolvimento` é a lista oficial e `Em andamento` foi
  **arquivada** por estar vazia e duplicar o significado. Listas manuais preservadas;
- **11 etiquetas oficiais**; as antigas permanecem intactas como apoio manual do Founder;
- distribuição: `Inbox` 2 · `Backlog aprovado` 32 · `Ready` 1 · `Em desenvolvimento` 0 ·
  `Em revisão técnica` 0 · `Revisão do Founder` 0 · `Bloqueado` 17 · `Concluído` 4;
- **`Ready` contém apenas MVP-DATA-02**; **nenhum card `POST-MVP` está em `Ready`**;
  **MVP-E3-04** permanece no `Backlog aprovado`; **MVP-BUSINESS-01** permanece pausado.

**A sincronização é idempotente e não destrutiva.** Nada é apagado, arquivado sem autorização,
renomeado por semelhança nem sobrescrito por suposição. Divergência vira registro, não conserto
automático.
