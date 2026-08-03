# Decision log do MVP — decisões do rebaseline

**Status: NORMATIVO.** Registro das decisões do Founder/PMO sobre o escopo de produto do MVP.
Contexto: REBASELINE TECHNICAL ASSESSMENT (Fase R0, 02/08/2026, veredito
`HUMAN DECISIONS REQUIRED`) e mandato da Fase R0.5.

Duas partes: a **matriz D1–D12**, que responde uma a uma as decisões que o assessment levantou, e o
**log**, que registra as decisões estruturais com contexto e consequência.

---

## Parte 1 — Matriz de decisões D1–D12

Cada linha traz a pergunta original do assessment §20, a alternativa que o CTO havia recomendado, a
decisão deste mandato, e os efeitos. **Decisões deste mandato prevalecem sobre a recomendação
anterior.**

Os princípios citados são os de [`../product/PRODUCT-PRINCIPLES.md`](../product/PRODUCT-PRINCIPLES.md).

---

### D1 — Fonte de dado da Home

|                         |                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | A Home passa a ler do banco, ou continua servida por fixture em modo DEMO?                                                                                                                                              |
| **Recomendada (R0)**    | resolver antes de R4; nenhuma alternativa preferida                                                                                                                                                                     |
| **Decisão**             | **Nenhuma das duas como estão.** Um único contrato de domínio e uma única interface de catálogo, com dois _adapters_: fixture em DEMO, Supabase em PILOTO/PRODUCTION. Nenhuma consulta direta espalhada em componentes. |
| **Base**                | mandato §9 + princípio 9                                                                                                                                                                                                |
| **Efeito no schema**    | nenhum                                                                                                                                                                                                                  |
| **Efeito na interface** | nenhum agora — a Home **não** é alterada nesta rodada. A migração é documentada em [`../product/COMPARISON-SPEC.md`](../product/COMPARISON-SPEC.md) §7 e executada em R4                                                |
| **Efeito na segurança** | positivo: reforça `services/catalog.ts` como único ponto de acesso a dados                                                                                                                                              |
| **Estado**              | **RESOLVIDA**                                                                                                                                                                                                           |

### D2 — Posição da busca

|                         |                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | A busca sobe para a primeira dobra? (`HOME-NORTH-STAR.md` decidiu o contrário na Parte 2)                                                                 |
| **Recomendada (R0)**    | nenhuma                                                                                                                                                   |
| **Decisão**             | **Sim.** Busca visível na primeira dobra. `docs/mvp/HOME-NORTH-STAR.md` §"Ordem da página" fica superseded no ponto da ordem — e **somente** nesse ponto. |
| **Base**                | mandato §4, E2.1                                                                                                                                          |
| **Efeito no schema**    | nenhum                                                                                                                                                    |
| **Efeito na interface** | alto — muda a ordem da Home. Executado em R4, não agora                                                                                                   |
| **Efeito na segurança** | nenhum                                                                                                                                                    |
| **Estado**              | **RESOLVIDA**                                                                                                                                             |

### D3 — Visibilidade de oferta não ativa

|                         |                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | Oferta encerrada/expirada continua visível, rotulada?                                                                                                                                                                                                                                                                                                           |
| **Recomendada (R0)**    | sim, com mudança de policy RLS                                                                                                                                                                                                                                                                                                                                  |
| **Decisão**             | **Sim, com prazo e por leitura controlada.** Oferta não ativa permanece explicada publicamente por até **24 horas**, prazo **configurável**. Não participa do ranking ativo. E a exposição **não** se faz ampliando a policy pública de `prices`: faz-se por leitura pública controlada (view, RPC ou equivalente) que expõe só os campos públicos necessários. |
| **Base**                | mandato §8 + princípios 4 e 5                                                                                                                                                                                                                                                                                                                                   |
| **Efeito no schema**    | alto — `offer_state`, `price_events`, superfície de leitura controlada                                                                                                                                                                                                                                                                                          |
| **Efeito na interface** | alto — seção rotulada fora da lista vigente                                                                                                                                                                                                                                                                                                                     |
| **Efeito na segurança** | alto — é a única mudança do contrato público de leitura. Exige gate próprio e sincronia com `isValidPrice()`                                                                                                                                                                                                                                                    |
| **Estado**              | **RESOLVIDA**                                                                                                                                                                                                                                                                                                                                                   |

### D4 — Imagens

|                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | Imagem entra no MVP? Servida do próprio domínio ou com mudança de CSP?                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Recomendada (R0)**    | curadoria manual, servida do próprio domínio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Decisão**             | **Imagem revisada entra no MVP.** Só imagem exata: outra gramatura e outra variante são proibidas. Arquivo servido por **origem controlada**. URL externa é registrada como procedência, não necessariamente renderizada. Revisão manual obrigatória, placeholder por categoria, aspect ratio estável, compressão, lazy loading, sem layout shift relevante. Cobertura: 100% nos Achados destacados, meta inicial de 90% na categoria promovida, placeholder nas exceções. **A alteração de CSP é documentada agora e executada depois.** |
| **Base**                | mandato §10 + princípio 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Efeito no schema**    | médio — sete campos de imagem em `products`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Efeito na interface** | alto — imagem no card e na comparação; LCP da Home passa a ser a imagem do destaque                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Efeito na segurança** | médio — `img-src 'self' data:` precisa mudar se a origem não for o próprio domínio. **CSP não é alterado nesta rodada**                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Estado**              | **RESOLVIDA**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### D5 — Arquitetura de analytics

|                         |                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | Opção A (só `page_view` no Worker), B (endpoint próprio) ou C (terceiro)?                                                                                                                                                                             |
| **Recomendada (R0)**    | B, com gate equivalente ao da Onda 3                                                                                                                                                                                                                  |
| **Decisão**             | **B — first-party, endpoint no Worker.** Lista fechada de eventos, validação server-side, nenhuma escrita pública direta em tabela de negócio, nenhuma SDK de publicidade, nenhuma ferramenta de terceiro nesta fase.                                 |
| **Base**                | mandato §13 + princípios 5 e 7                                                                                                                                                                                                                        |
| **Efeito no schema**    | médio — tabela de eventos própria, fora das tabelas de negócio                                                                                                                                                                                        |
| **Efeito na interface** | baixo — sem elemento visível                                                                                                                                                                                                                          |
| **Efeito na segurança** | alto — endpoint de escrita novo, com o mesmo rito da Onda 3                                                                                                                                                                                           |
| **Estado**              | **RESOLVIDA na arquitetura.** A **tecnologia de armazenamento** fica PENDENTE: o mandato exige ADR com alternativas (logs estruturados, mecanismo da plataforma, agregação first-party) e proíbe escolher ou instalar sem spike e novo gate. Ver P-02 |

### D6 — As seis ambiguidades de equivalência

Todas resolvidas por princípio, sem inventar informação nova. Detalhamento e exemplos em
[`../product/CANONICAL-PRODUCT-SPEC.md`](../product/CANONICAL-PRODUCT-SPEC.md) §4.

| Caso                                                    | Decisão                                                                                               | Base                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Marca própria de rede A × rede B                        | **SIMILAR** — marca diferente, produto diferente                                                      | princípio 1                                          |
| Variante (tradicional × extraforte)                     | **SIMILAR** — variante é campo de identidade do SKU                                                   | princípio 1                                          |
| Peso variável / granel                                  | **fora do escopo comparável do MVP** — sem quantidade estruturada não há SKU exato nem preço unitário | princípios 1 e 3                                     |
| Pack × unidade (12 rolos × 4 rolos)                     | **OUTRO TAMANHO** — mesmo produto, quantidade diferente                                               | mandato §5                                           |
| Reformulação silenciosa (1 L → 900 ml com o mesmo GTIN) | **a quantidade vence o GTIN** — são dois SKUs                                                         | mandato §5: "GTIN não é a única prova de identidade" |
| Embalagem (vidro × sachê × lata)                        | **SIMILAR** — `package_type` é campo de identidade do SKU                                             | mandato §5 + princípio 1                             |

**Estado: RESOLVIDA.**

### D7 — Onde aparece o preço unitário

|                         |                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | Preço unitário é exibido no card, ou só na seção "outro tamanho"?                                                                                                                                                                                                                                     |
| **Recomendada (R0)**    | nenhuma                                                                                                                                                                                                                                                                                               |
| **Decisão**             | **No card e na comparação**, sempre que a quantidade estiver estruturada e aprovada (`calculation_status = ok`). E é o **único** critério de comparação permitido na seção "outro tamanho". Nunca é o critério de ordenação da lista orgânica, que continua por preço absoluto entre produtos EXATOS. |
| **Base**                | mandato §4 (E1 lista "preço por unidade") e §6                                                                                                                                                                                                                                                        |
| **Efeito no schema**    | nenhum além do de D-quantidade — o unitário é **calculado, não armazenado**                                                                                                                                                                                                                           |
| **Efeito na interface** | médio — item 9 do Card v2                                                                                                                                                                                                                                                                             |
| **Efeito na segurança** | nenhum                                                                                                                                                                                                                                                                                                |
| **Estado**              | **RESOLVIDA**                                                                                                                                                                                                                                                                                         |

### D8 — Rota da tela de comparação

|                      |                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Pergunta**         | A comparação continua em `/produto/$productId` ou vira rota nova?                                           |
| **Recomendada (R0)** | nenhuma                                                                                                     |
| **Decisão**          | **não tomada neste mandato**                                                                                |
| **Base**             | nenhum dos dez princípios alcança a questão — é escolha de URL e de continuidade de links já compartilhados |
| **Efeito potencial** | sitemap (PR #44), links já em circulação, `og:url`, `canonical`                                             |
| **Estado**           | **PENDENTE — P-03**                                                                                         |

Recomendação do CTO, para quando o PMO decidir: manter `/produto/$productId`. A rota já é
compartilhável, já está no ar, e o custo de trocar é pagar redirecionamento permanente por um ganho
apenas semântico. Nada nesta documentação depende da resposta.

### D9 — Convivência de dado real e fictício

|                         |                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | Dado real e dado fictício podem conviver no mesmo projeto Supabase?                                                                                                                                                                                                                                                    |
| **Recomendada (R0)**    | nenhuma                                                                                                                                                                                                                                                                                                                |
| **Decisão**             | **Não.** DEMO usa adapter de fixture com dados versionados; nenhum dado real. PILOTO/PRODUCTION usa adapter Supabase. A separação é por _adapter_ e por ambiente, não por flag de linha. `is_demo` permanece nas tabelas como sinal defensivo — **não** é o mecanismo de separação e não deve ser usado como se fosse. |
| **Base**                | mandato §9 + princípio 9                                                                                                                                                                                                                                                                                               |
| **Efeito no schema**    | nenhum — `is_demo` não é removido                                                                                                                                                                                                                                                                                      |
| **Efeito na interface** | nenhum                                                                                                                                                                                                                                                                                                                 |
| **Efeito na segurança** | positivo — elimina a classe inteira de erro "dado fictício vazou como real"                                                                                                                                                                                                                                            |
| **Estado**              | **RESOLVIDA**                                                                                                                                                                                                                                                                                                          |

### D10 — PRs de Dependabot

|                      |                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pergunta**         | Os seis PRs de Dependabot ficam congelados até o fim do rebaseline?                                                                        |
| **Recomendada (R0)** | congelar até o fim de R6                                                                                                                   |
| **Decisão**          | **não tomada neste mandato** — nenhum princípio alcança política de dependência                                                            |
| **Efeito potencial** | zod 3→4 atinge `validateSearch`; TypeScript 5→7 atinge o modo estrito; eslint 9→10 atinge o CI. Os três chegariam junto com um schema novo |
| **Estado**           | **PENDENTE — P-04**                                                                                                                        |

Nenhum deles foi tocado nesta rodada, e o mandato R0.5 proíbe alterar dependências — na prática
estão congelados até que o PMO diga o contrário.

### D11 — Ordem de merge do PR #44

|                         |                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | PR #44 é mergeado antes ou depois de R1?                                                                                                                                                                                                      |
| **Decisão**             | **Nenhum dos dois agora.** O trabalho de domínio está **pausado**; o PR #44 permanece aberto, verde e **intacto** — sem update, sem rebase, sem merge, sem fechamento. A ordem de merge volta a ser pergunta quando o domínio for destravado. |
| **Base**                | mandato §0 e §15                                                                                                                                                                                                                              |
| **Efeito no schema**    | nenhum                                                                                                                                                                                                                                        |
| **Efeito na interface** | nenhum                                                                                                                                                                                                                                        |
| **Efeito na segurança** | nenhum — a proteção de indexação que ele traz continua não publicada, e o `workers.dev` continua não divulgado                                                                                                                                |
| **Estado**              | **RESOLVIDA para esta fase**                                                                                                                                                                                                                  |

### D12 — `markets.city`

|                         |                                                                              |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Pergunta**            | Entra como campo exibido ou fica dormente?                                   |
| **Recomendada (R0)**    | decisão do PMO                                                               |
| **Decisão**             | **Entra no contrato de identidade de mercado.** A coluna **não** é removida. |
| **Base**                | mandato §16, TD-003                                                          |
| **Efeito no schema**    | nenhum — a coluna já existe com `NOT NULL DEFAULT 'Artemis'`                 |
| **Efeito na interface** | baixo — cidade passa a acompanhar bairro onde o mercado é identificado       |
| **Efeito na segurança** | nenhum — campo público, sem dado pessoal                                     |
| **Estado**              | **RESOLVIDA**                                                                |

---

### Resumo

| Estado                 | Decisões                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| **RESOLVIDA**          | D1, D2, D3, D4, D6, D7, D9, D11, D12 — **nove**                      |
| **RESOLVIDA em parte** | D5 (arquitetura sim; tecnologia de armazenamento pendente) — **uma** |
| **PENDENTE**           | D8, D10 — **duas**                                                   |

---

## Parte 2 — Perguntas abertas

Nenhuma destas pode virar código ou migration enquanto estiver aberta.

| #        | Pergunta                                                                                                                                                                                                                                                    | Origem                                                                                                                                       | Bloqueia                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **P-01** | Qual a **janela temporal** para selecionar a observação anterior que vira "preço anterior"?                                                                                                                                                                 | mandato §7: "caso a janela temporal exata não esteja decidida no assessment, marcar como PENDENTE. Não inventar." O assessment não a decidiu | E2.10 e o item 7 do Card v2 |
| **P-02** | Qual a **tecnologia de armazenamento** dos eventos de analytics?                                                                                                                                                                                            | mandato §13: exige ADR com alternativas e proíbe escolher sem spike e novo gate                                                              | R8                          |
| **P-03** | A comparação fica em `/produto/$productId` ou em rota nova? (D8)                                                                                                                                                                                            | assessment §20                                                                                                                               | R5, sitemap                 |
| **P-04** | Política para os seis PRs de Dependabot. (D10)                                                                                                                                                                                                              | assessment §20                                                                                                                               | higiene de CI               |
| **P-05** | Qual o **valor inicial e o mecanismo de configuração** do prazo de 24 h de visibilidade de oferta não ativa? O mandato fixa 24 h e exige que seja configurável, mas não diz onde a configuração vive (constante versionada, variável de ambiente ou coluna) | mandato §8                                                                                                                                   | R8                          |

---

## Parte 3 — Log de decisões estruturais

Formato por entrada: data · decisão · contexto · alternativas · consequência · documentos afetados ·
status.

---

### DL-001 — Roadmap anterior substituído no escopo de produto

- **Data:** 02/08/2026
- **Decisão:** o Roadmap MVP v3 (E1/E2/E3) passa a ser a fonte oficial do **escopo de produto**. O
  roadmap anterior (`PLANO-MESTRE.md` §12.5 Roadmap A, §13) continua válido em governança, gates e
  restrições, e fica superseded no que diz respeito a escopo de produto.
- **Contexto:** o assessment mostrou que a comparação já existia e estava correta, enquanto o
  roadmap tratava-a como fase futura.
- **Alternativas:** (a) emendar o roadmap anterior — rejeitada: a mudança é de enquadramento, não de
  detalhe; (b) substituir tudo — rejeitada: apagaria governança e segurança válidas.
- **Consequência:** documentos de produto anteriores recebem marcação de superseded no ponto exato
  do conflito, nunca por inteiro.
- **Documentos:** `PLANO-MESTRE.md`, `docs/mvp/TEST-MVP-PLAN.md`, `docs/mvp/HOME-NORTH-STAR.md`,
  `CLAUDE.md`, `README.md`
- **Status:** ativa

### DL-002 — Comparação é o núcleo do MVP

- **Data:** 02/08/2026
- **Decisão:** a comparação do mesmo produto entre mercados é o núcleo do MVP; tudo mais serve a ela.
- **Contexto:** a definição oficial do produto foi reescrita pelo Founder/PMO.
- **Alternativas:** manter Achados como núcleo — rejeitada: Achado é porta de entrada, não a tarefa.
- **Consequência:** E2 concentra o investimento; a busca sobe para a primeira dobra (D2).
- **Documentos:** `docs/product/ROADMAP-MVP-v3.md`, `docs/product/COMPARISON-SPEC.md`
- **Status:** ativa

### DL-003 — Achados como aquisição e descoberta

- **Data:** 02/08/2026
- **Decisão:** Achados permanecem, com a anatomia e as regras da Parte 2 intactas, reposicionados
  como mecanismo de aquisição, descoberta e retenção.
- **Contexto:** o `AchadoCard` e suas regras (não inventar validade, não inventar preço anterior, não
  criar urgência) sobreviveram à auditoria sem nenhum reparo.
- **Alternativas:** remover Achados — rejeitada: é a superfície que circula no WhatsApp.
- **Consequência:** o Card v2 evolui a partir do `AchadoCard`, não o substitui.
- **Documentos:** `docs/product/CARD-V2-SPEC.md`, `docs/mvp/HOME-NORTH-STAR.md`
- **Status:** ativa

### DL-004 — Produto é SKU exato

- **Data:** 02/08/2026
- **Decisão:** o registro comparável representa um SKU exato: marca, variante, embalagem, quantidade
  e unidade fazem parte da identidade. Sem camada abstrata de família como requisito do MVP.
- **Contexto:** o assessment propôs `canonical_products` + FK. O mandato §5 é explícito: "não criar
  uma camada abstrata complexa de família de produto como requisito do MVP, salvo evidência concreta
  no assessment de que ela é indispensável" — e não há essa evidência.
- **Alternativas:** produto canônico + SKU em duas tabelas — **adiada**, não descartada. Fica como
  "família futura" para relacionar outros tamanhos.
- **Consequência:** R1 fica muito menor do que o assessment previa: estrutura `products` como SKU
  exato, sem tabela nova e sem backfill de agrupamento.
- **Documentos:** `docs/product/CANONICAL-PRODUCT-SPEC.md`, `docs/data/MVP-DATA-CONTRACT.md`
- **Status:** ativa

### DL-005 — Home com contrato único e adapters (D1)

- **Data:** 02/08/2026
- **Decisão:** um contrato de domínio, uma interface de catálogo, dois adapters (fixture / Supabase).
- **Contexto:** hoje a Home lê de fixture e a busca lê do banco — dois caminhos de dado.
- **Alternativas:** (a) tudo do banco — rejeitada: derrubaria a demonstração offline e o SSR sem
  rede; (b) tudo de fixture — rejeitada: o piloto precisa de dado vivo.
- **Consequência:** `services/catalog.ts` vira a interface; `home-opportunities`/`home-markets` viram
  adapters. Executado em R4.
- **Documentos:** `docs/product/COMPARISON-SPEC.md`, `docs/mvp/HOME-INITIAL-RENDER.md`
- **Status:** ativa, não implementada

### DL-006 — Imagem entra no MVP (D4)

- **Data:** 02/08/2026
- **Decisão:** imagem revisada, exata, de origem controlada, com placeholder por categoria.
- **Contexto:** o CSP atual (`img-src 'self' data:`) impede host externo e Supabase Storage.
- **Alternativas:** MVP sem imagem — rejeitada pelo Founder/PMO; imagem por GTIN automatizada —
  rejeitada: licença incerta e cobertura fraca.
- **Consequência:** sete campos novos em `products`; alteração futura de CSP documentada e **não**
  executada agora.
- **Documentos:** `docs/data/IMAGE-POLICY.md`
- **Status:** ativa, não implementada

### DL-007 — Oferta não ativa visível temporariamente (D3)

- **Data:** 02/08/2026
- **Decisão:** 24 h de visibilidade explicada, prazo configurável, fora do ranking ativo, por
  leitura pública controlada — **não** por ampliação da policy de `prices`.
- **Contexto:** hoje a RLS torna o preço vencido invisível; a oferta some sem explicação.
- **Alternativas:** ampliar a policy pública — rejeitada pelo mandato §8 e pelo princípio 4.
- **Consequência:** é a mudança de maior risco do roadmap. Gate próprio, sincronia obrigatória entre
  `isValidPrice()` e o banco.
- **Documentos:** `docs/data/OFFER-STATES.md`
- **Status:** ativa, não implementada

### DL-008 — Preço anterior rastreável

- **Data:** 02/08/2026
- **Decisão:** preço anterior é derivado de observação anterior **real** do mesmo `product_id`, mesmo
  `market_id`, em estado aprovado e com data conhecida. **Proibido** campo livre de "preço de
  referência" sem procedência.
- **Contexto:** hoje `previous_price` existe só no fixture de demonstração.
- **Alternativas:** campo manual informado pelo mercado — rejeitada: é preço sem procedência, e
  procedência é o produto.
- **Consequência:** depende da leitura controlada de DL-007. A janela temporal é **P-01**.
- **Documentos:** `docs/data/OFFER-STATES.md`, `docs/product/CARD-V2-SPEC.md`
- **Status:** ativa, não implementada, com pendência

### DL-009 — Promoções tipificadas

- **Data:** 02/08/2026
- **Decisão:** quatro tipos estruturados (`unit_limit`, `buy_x_pay_y`, `second_unit_discount`,
  `quantity_price`), mais um campo de texto original preservado para o que ainda não é tipificável.
- **Contexto:** hoje tudo é texto livre em `special_condition`.
- **Alternativas:** manter só texto — rejeitada: impede calcular preço efetivo; tipificar tudo —
  rejeitada: produz estrutura falsa.
- **Consequência:** o texto livre **não** pode ser base de regra computável.
- **Documentos:** `docs/data/PROMOTION-TYPES.md`
- **Status:** ativa, não implementada

### DL-010 — Analytics first-party (D5)

- **Data:** 02/08/2026
- **Decisão:** endpoint no Worker, lista fechada de eventos, validação server-side, sem terceiros.
- **Contexto:** não existe analytics; qualquer escrita do navegador colide com a Onda 3.
- **Alternativas:** ferramenta de terceiro — rejeitada nesta fase; só log no Worker — insuficiente
  para o funil.
- **Consequência:** gate próprio, equivalente ao da Onda 3. Tecnologia de armazenamento é **P-02**.
- **Documentos:** `docs/analytics/MVP-EVENT-TAXONOMY.md`
- **Status:** ativa, não implementada, com pendência

### DL-011 — Ranking neutro e desempate estável

- **Data:** 02/08/2026
- **Decisão:** só ofertas vigentes no ranking ativo; ordem por preço crescente, depois observação
  mais recente, depois identificador estável; pagamento e destaque não interferem; outros tamanhos e
  similares fora da lista.
- **Contexto:** a neutralidade já era regra; faltava o terceiro critério de desempate (TD-002).
- **Alternativas:** ordenar pelo preço efetivo da promoção — rejeitada: a ordem passaria a depender
  de quantas unidades a pessoa vai levar.
- **Consequência:** PR técnico A desta rodada implementa o terceiro critério.
- **Documentos:** `docs/product/COMPARISON-SPEC.md`, `docs/pmo/TECHNICAL-DEBT-REGISTER.md`
- **Status:** ativa, parcialmente implementada nesta rodada

### DL-012 — Domínio pausado e PR #44 preservado (D11)

- **Data:** 02/08/2026
- **Decisão:** trabalho de domínio pausado; PR #44 permanece aberto e intacto; DNS no Registro.br;
  DNSSEC ativo; nenhuma zona Cloudflare criada.
- **Contexto:** a troca de nameservers com DS publicado derruba a resolução do domínio; a ação é
  humana e ainda não foi executada.
- **Alternativas:** fechar e refazer o PR — rejeitada: descartaria trabalho verde sem ganho.
- **Consequência:** a lista fixa de rotas do `sitemap.xml` dentro do PR precisará de emenda em R5.
- **Documentos:** `docs/mvp/DEMO-ENVIRONMENT.md`
- **Status:** ativa

### DL-013 — Dados reais bloqueados

- **Data:** 02/08/2026
- **Decisão:** nenhum dado real de mercado, produto ou preço é cadastrado em nenhum ambiente.
  Produção permanece vazia. DEMO usa fixture versionado (D9).
- **Contexto:** herdado de `PLANO-MESTRE.md` §12.5 e reafirmado no mandato R0.5.
- **Alternativas:** nenhuma.
- **Consequência:** MVP-BUSINESS-01 (pesquisa de campo em Artemis) fica pausado para plano de
  delegação.
- **Documentos:** `PLANO-MESTRE.md`, `docs/mvp/TEST-MVP-PLAN.md`, `docs/pmo/TRELLO-MAPPING.md`
- **Status:** ativa
