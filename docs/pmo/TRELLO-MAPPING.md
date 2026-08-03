# Mapa do Trello

**Status: NORMATIVO** para a montagem do quadro. **O Trello não foi criado. Nenhuma API foi
integrada.** Este documento existe para que o quadro seja montado sem nenhuma decisão paralela: tudo
o que um card precisa já está decidido aqui ou aponta para o documento que decide.

**Nenhum card abaixo está autorizado a virar código.** Autorizar implementação é ato separado do
Founder/PMO.

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

`E1 — Identidade exata` · `E2 — Comparação confiável` · `E3 — Aquisição e retenção` · `DATA` ·
`DESIGN` · `SECURITY` · `BUSINESS` · `DOCS`

`SECURITY` acumula com a etiqueta de épico. Todo card com `SECURITY` exige revisão adversarial antes
de sair da lista 5.

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
- **Dependências:** **P-03 resolvida** · **Etapa:** R5 · **Etiquetas:** E2, DESIGN
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

- **Objetivo:** alinhar `pa_normalize_text()` e `normalizeSearchText()` (TD-001).
- **Fonte:** `docs/data/PRODUCT-IDENTIFIERS.md` §2
- **Dependências:** nenhuma · **Etapa:** R0.5 · **Etiquetas:** DATA
- **Aceite:** os onze vetores idênticos nos dois lados; migration **criada e não aplicada**; rollback
  documentado; nenhum produto unido automaticamente.
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
- **Dependências:** MVP-E1-03 · **Etapa:** R3 · **Etiquetas:** DESIGN, E2
- **Aceite:** rota de desenvolvimento, dados do fixture, nenhum schema.
- **Gate:** **sim** — o Founder decide antes da implementação.
- **Fora de escopo:** produção. · **Evidência:** capturas em 360 px e desktop.

### MVP-DESIGN-02 — Protótipo da comparação com unitário e estados

- **Objetivo:** idem, para a comparação. · **Fonte:** `MVP-EXECUTION-PLAN.md` R3
- **Dependências:** MVP-E1-06 · **Etapa:** R3 · **Etiquetas:** DESIGN, E2
- **Aceite:** as três seções, os quatro estados públicos, unitário ausente sem quebrar.
- **Gate:** **sim.** · **Fora de escopo:** produção. · **Evidência:** capturas.

### MVP-DESIGN-03 — Card v2, anatomia dos 17 itens

- **Objetivo:** evoluir o `AchadoCard`. · **Fonte:** `docs/product/CARD-V2-SPEC.md`
- **Dependências:** MVP-DESIGN-02 · **Etapa:** R6 · **Etiquetas:** DESIGN, E2
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
- **Dependências:** MVP-DESIGN-01 · **Etapa:** R4 · **Etiquetas:** DESIGN, E2
- **Aceite:** Achados continuam presentes e servidos pelo loader; CTA fixo do mobile continua com
  anti-duplicação; nenhum carregamento no HTML inicial.
- **Gate:** **sim.** · **Fora de escopo:** rodapé novo.
- **Evidência:** capturas + `index.ssr.test.ts`.

---

## BUSINESS

### MVP-BUSINESS-01 — Pesquisa de campo e entrevistas em Artemis

- **Status: PAUSADO PARA PLANO DE DELEGAÇÃO**
- **Objetivo:** mapear sobreposição de produtos entre mercados, disponibilidade de GTIN, capacidade
  real de envio de ofertas, formatos de promoção praticados, como correções e esgotamentos são
  comunicados hoje, e aceitação da ideia de comparação pública de preço.
- **Fonte:** `docs/mvp/TEST-MVP-PLAN.md` Gate V2 · `PLANO-MESTRE.md` §11
- **Dependências:** autorização específica do Founder para contato externo
- **Etapa:** fora da sequência R · **Etiquetas:** BUSINESS
- **Aceite:** plano de delegação escrito antes de qualquer contato; nenhum dado pessoal coletado sem
  base definida; nenhum compromisso comercial assumido em campo.
- **Gate:** **sim** — contato com pessoa real exige autorização específica.
- **Fora de escopo:** cadastro de dado real; promessa de publicação; cashback.
- **Evidência:** plano de delegação + roteiro de entrevista, ambos revisados antes de ir a campo.

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

### MVP-DOCS-03 — Decidir P-03 (rota da comparação)

- **Objetivo:** manter `/produto/$productId` ou criar rota nova.
- **Fonte:** `MVP-DECISION-LOG.md` D8 · **Bloqueia:** R5, MVP-E2-10, TD-008
- **Etiquetas:** DOCS · **Gate:** **sim.** · **Evidência:** entrada no decision log.

### MVP-DOCS-04 — Decidir P-04 (Dependabot)

- **Objetivo:** política para os seis PRs de _major_ abertos.
- **Fonte:** `MVP-DECISION-LOG.md` D10 · **Bloqueia:** higiene de CI
- **Etiquetas:** DOCS · **Gate:** **sim.** · **Evidência:** entrada no decision log.

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

---

## Cards já concluídos nesta rodada

| ID          | Onde                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| MVP-DOCS-01 | PR `docs/mvp-roadmap-v3-source-of-truth`                                      |
| MVP-E2-01   | PR `fix/comparison-deterministic-tiebreaker`                                  |
| MVP-DATA-01 | PR `fix/product-normalization-contract` — **migration criada e não aplicada** |

Os três entram no quadro na lista **Revisão do Founder**, não em Concluído: nenhum foi mergeado.
