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

|                         |                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pergunta**            | A comparação continua em `/produto/$productId` ou vira rota nova?                                                                                                 |
| **Recomendada (R0)**    | manter `/produto/$productId`                                                                                                                                      |
| **Decisão**             | **A rota canônica da comparação no MVP permanece `/produto/$productId`.** Ela representa um SKU exato e exibe suas ofertas em diferentes mercados.                |
| **CTA**                 | o rótulo público passa a ser **"Comparar em X mercados"** e continua levando a `/produto/$productId`. A mudança é de jornada e de apresentação, não de roteamento |
| **Não criar**           | `/comparar/$productId`, redirect, alias, rota nova — e **nenhuma alteração de código nesta missão**                                                               |
| **Base**                | decisão do Founder/PMO, 03/08/2026                                                                                                                                |
| **Racional**            | a tela existente já é a comparação; evita churn de URL; preserva compartilhamentos já em circulação; reduz código e testes                                        |
| **Efeito no schema**    | nenhum                                                                                                                                                            |
| **Efeito na interface** | baixo — só o rótulo do CTA                                                                                                                                        |
| **Efeito na segurança** | nenhum. `sitemap.xml`, `canonical` e `og:url` continuam apontando para a rota que já existe                                                                       |
| **Hipótese futura**     | uma rota dedicada fica registrada **apenas como hipótese**, condicionada a necessidade comprovada — nunca por preferência estética                                |
| **Estado**              | **RESOLVIDA**                                                                                                                                                     |

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

|                         |                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pergunta**            | Os seis PRs de Dependabot ficam congelados até o fim do rebaseline?                                                                                                                                                                                                                                                                                                                                                                  |
| **Recomendada (R0)**    | congelar até o fim de R6                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Decisão**             | **Política escrita**, em [`DEPENDENCY-POLICY.md`](DEPENDENCY-POLICY.md): nenhum auto-merge; crítica ou alta em PR isolado com merge manual; moderada ou baixa em revisão periódica; patch/minor agrupáveis por ecossistema quando comprovadamente seguras; **major sempre em PR próprio**; dependência não utilizada removida em PR próprio; CI ou CodeQL vermelho proíbe merge; alteração inesperada de lockfile exige investigação |
| **Inventário**          | os seis auditados em modo somente leitura. **Zero alertas de segurança abertos** — todos são manutenção. Os seis são **major**, logo nenhum é agrupável. #4 e #5 estão com CI vermelho, por causa externa e por regra nova de lint                                                                                                                                                                                                   |
| **Efeito no schema**    | nenhum                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Efeito na interface** | nenhum                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Efeito na segurança** | positivo — a regra de lockfile inesperado cobre a superfície de cadeia de suprimentos                                                                                                                                                                                                                                                                                                                                                |
| **Estado**              | **RESOLVIDA na política**                                                                                                                                                                                                                                                                                                                                                                                                            |

A política **não autoriza** o merge de nenhum dos seis. Nenhum foi tocado: sem update de branch,
sem merge, sem fechamento, sem auto-merge, sem alteração de dependência.

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
| **RESOLVIDA**          | D1, D2, D3, D4, D6, D7, **D8**, D9, **D10**, D11, D12 — **onze**     |
| **RESOLVIDA em parte** | D5 (arquitetura sim; tecnologia de armazenamento pendente) — **uma** |
| **PENDENTE**           | nenhuma                                                              |

D8 e D10 foram fechadas pelo Founder/PMO em 03/08/2026. **As doze decisões do assessment estão
resolvidas.** As pendências que restam (§Parte 2) não vieram do assessment — são perguntas que a
própria documentação levantou ao descer ao detalhe.

---

## Parte 2 — Perguntas abertas

Nenhuma destas pode virar código ou migration enquanto estiver aberta.

| #        | Pergunta                                                                                                                                                                                                                                                    | Origem                                                                                                                                       | Bloqueia                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **P-01** | Qual a **janela temporal** para selecionar a observação anterior que vira "preço anterior"?                                                                                                                                                                 | mandato §7: "caso a janela temporal exata não esteja decidida no assessment, marcar como PENDENTE. Não inventar." O assessment não a decidiu | E2.10 e o item 7 do Card v2 |
| **P-02** | Qual a **tecnologia de armazenamento** dos eventos de analytics?                                                                                                                                                                                            | mandato §13: exige ADR com alternativas e proíbe escolher sem spike e novo gate                                                              | R8                          |
| **P-05** | Qual o **valor inicial e o mecanismo de configuração** do prazo de 24 h de visibilidade de oferta não ativa? O mandato fixa 24 h e exige que seja configurável, mas não diz onde a configuração vive (constante versionada, variável de ambiente ou coluna) | mandato §8                                                                                                                                   | R8                          |

**Fechadas em 03/08/2026:** **P-03** (rota da comparação — permanece `/produto/$productId`, ver D8)
e **P-04** (política de dependências — ver D10 e [`DEPENDENCY-POLICY.md`](DEPENDENCY-POLICY.md)).
Restam três: P-01, P-02 e P-05, todas bloqueando apenas R8.

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

### DL-014 — Rota canônica da comparação (D8 / P-03)

- **Data:** 03/08/2026
- **Decisão:** a comparação permanece em `/produto/$productId`. O CTA público passa a ser
  "Comparar em X mercados" e continua levando à mesma rota. Nenhuma rota nova, nenhum redirect,
  nenhum alias, e nenhuma alteração de código nesta missão.
- **Contexto:** a tela existente já é a comparação — o assessment R0 concluiu isso, e a mudança
  que E2 pede é de jornada e apresentação, não de roteamento.
- **Alternativas:** `/comparar/$productId` com redirect permanente — rejeitada: pagaria churn de
  URL, quebraria compartilhamentos já em circulação e acrescentaria rota, sitemap e testes por um
  ganho apenas semântico.
- **Consequência:** R5 deixa de ter dependência bloqueante; `sitemap.xml`, `canonical` e `og:url`
  continuam apontando para a rota que já existe; o PR #44 não precisa de nenhuma emenda por causa
  desta decisão. Uma rota dedicada fica registrada como hipótese futura, condicionada a
  necessidade comprovada.
- **Documentos:** `docs/product/COMPARISON-SPEC.md`, `docs/pmo/MVP-EXECUTION-PLAN.md`,
  `docs/pmo/TRELLO-MAPPING.md`
- **Status:** ativa

### DL-015 — Política de dependências (D10 / P-04)

- **Data:** 03/08/2026
- **Decisão:** política escrita em [`DEPENDENCY-POLICY.md`](DEPENDENCY-POLICY.md), com inventário
  somente leitura dos seis PRs abertos.
- **Contexto:** seis PRs de _major_ abertos desde 28/07, nenhum com alerta de segurança associado.
- **Alternativas:** auto-merge para patch/minor — rejeitada: todo merge neste projeto é gate
  humano (`PLANO-MESTRE.md` §0), e abrir exceção para dependência é abrir na superfície de cadeia
  de suprimentos.
- **Consequência:** os seis continuam abertos e intocados. A janela recomendada para tratá-los é
  depois de R2, com a estrutura de dados estabilizada.
- **Documentos:** `docs/pmo/DEPENDENCY-POLICY.md`
- **Status:** ativa

### DL-016 — Trilha pós-MVP de automação de ingestão

- **Data:** 03/08/2026
- **Decisão:** registrar, **fora do MVP**, a trilha de automação complementar de ingestão de
  preços: sequência PM-DATA-0 a PM-DATA-7, ordem provisória de fontes, regras de matching, classes
  de qualidade e política de procedência.
- **Contexto:** duas afirmações do Founder, classificadas como **[F] — contexto, não evidência
  quantitativa**: Artemis isoladamente pode não produzir volume suficiente para comparações úteis,
  e moradores de Artemis também compram em redes próximas.
- **Alternativas:** (a) não registrar e decidir depois — rejeitada: a decisão futura ficaria sem
  base escrita; (b) começar a investigar fontes agora — rejeitada: nada da trilha pode começar
  autonomamente, e o Gate de necessidade exige medir o déficit antes de construir qualquer coisa.
- **Consequência:** quatro documentos em `docs/post-mvp/` e catorze cards `PM-DATA-*`, **todos
  fora de Ready**. Nenhuma infraestrutura preventiva. Nenhuma investigação autoriza publicação.
- **Documentos:** `docs/post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`,
  `docs/post-mvp/SOURCE-CONNECTOR-STATUS.md`, `docs/post-mvp/AUTOMATION-QUALITY-GATES.md`,
  `docs/post-mvp/PRICE-PROVENANCE-POLICY.md`
- **Status:** ativa, não iniciada
- **Corrigida em 03/08/2026 por DL-017** no ponto do registro de investigações anteriores.

### DL-017 — Procedência dos estudos anteriores de fontes

- **Data:** 03/08/2026
- **Decisão:** a documentação **não pode afirmar que nenhuma investigação técnica de fontes
  existiu**. Passa a distinguir quatro estados: **[F] existência relatada**, **NOT LOCATED**,
  **NOT VERIFIED** e **[C] confirmado**.
- **Contexto:** o handoff do Founder/PMO informa **[F]** que dois estudos foram produzidos — um
  plano técnico sobre Pague Menos, São Vicente e Carrefour (`plano-coleta-automatica-ofertas.md`)
  e uma investigação complementar sobre Savegnago e Atacadão
  (`investigacao-savegnago-atacadao.md`). A redação anterior de `SOURCE-CONNECTOR-STATUS.md` §4
  dizia "nenhuma investigação técnica foi feita por este projeto", o que contradiz o handoff.
- **O que foi verificado:** os dois relatórios **não foram localizados** nesta missão. Caminhos
  inspecionados: árvore de trabalho completa do repositório inclusive arquivos ignorados pelo Git;
  histórico de objetos de todos os refs; `git stash`; diretório de sessão do projeto. Nenhum
  arquivo com esses nomes, nenhum objeto de histórico com esse conteúdo.
- **O que não foi verificado:** os achados técnicos específicos dos dois estudos. Não foram
  reproduzidos, não foram validados, nenhuma fonte foi acessada. **Nenhum achado do handoff é
  promovido a [C].**
- **Alternativas:** (a) manter "nenhuma investigação foi feita" — rejeitada: contradiz o Founder e
  descarta trabalho que pode existir; (b) incorporar os achados relatados como verificados —
  rejeitada: promoveria a **[C]** conteúdo que ninguém consegue abrir; (c) refazer as
  investigações — rejeitada: não autorizado, e acessar fonte exige Gate.
- **Consequência:** os detalhes técnicos por fonte permanecem **[H]** até que a evidência seja
  localizada ou reproduzida; **os relatórios anteriores devem ser localizados, versionados ou
  substituídos por evidência reproduzível antes de qualquer spike pós-MVP**; PM-DATA-02 passa a
  ser "Localizar e preservar investigações anteriores".
- **Documentos:** `docs/post-mvp/SOURCE-CONNECTOR-STATUS.md` §4,
  `docs/post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md` §1 e §7, `docs/pmo/TRELLO-MAPPING.md`
  (PM-DATA-02)
- **Status:** ativa — pendência aberta. O destino dos relatórios, quando localizados, foi definido
  por **DL-018**: `docs/evidence/price-sources/README.md` §10

### DL-018 — Fronteira documental dos contratos pós-MVP de ingestão

- **Data:** 03/08/2026
- **Decisão:** **três documentos novos**, e não ampliação dos existentes:
  `docs/data/SOURCE-PRODUCT-ALIASES.md`, `docs/data/PRICE-CONDITION-TAXONOMY.md` e
  `docs/evidence/price-sources/README.md`. Os documentos normativos do MVP —
  `MVP-DATA-CONTRACT.md`, `PROMOTION-TYPES.md`, `PRODUCT-IDENTIFIERS.md`,
  `CANONICAL-PRODUCT-SPEC.md` — **permanecem íntegros**, ganhando apenas referências cruzadas.
- **Contexto:** o mandato R0.6 pediu auditoria antes de criar, com preferência declarada por
  ampliar documento existente e por referenciar em vez de copiar.
- **Por que não ampliar, caso a caso:**
  - **alias de fonte** não é o alias que o projeto já tem. `CANONICAL-PRODUCT-SPEC.md` §5 e
    `search_aliases` tratam de **entrada de busca**, explicitamente "nunca identidade"; alias de
    fonte **é** vínculo de identidade. São opostos no ponto decisivo: um alias de busca errado
    devolve um resultado a mais, um alias de fonte errado publica o preço do produto errado;
  - **tipo e condição de preço** é ortogonal a `PROMOTION-TYPES.md`, não uma extensão dele:
    promoção é mecânica de desconto, tipo de preço é qual preço é e para quem. Um preço de clube
    sem promoção existe; uma promoção no canal online existe;
  - **em ambos os casos**, escrever no contrato do MVP colocaria conteúdo pós-MVP na fila de
    migrations de R1/R2 por acidente — o risco que a trilha existe para evitar;
  - **índice de evidências** não tinha cobertura alguma: `docs/evidence/` não existia.
- **Alternativas:** (a) ampliar `MVP-DATA-CONTRACT.md` — rejeitada pelo risco de migration
  acidental; (b) escrever tudo dentro de `AUTOMATED-PRICE-INGESTION-ROADMAP.md` — rejeitada:
  aquele documento é sequência e gates, não contrato de dado, e ficaria ilegível; (c) só
  referenciar, sem documento novo — rejeitada: não há onde referenciar, o conteúdo não existe.
- **Antiduplicação:** a **ordem de matching** continua normativa apenas em
  `AUTOMATED-PRICE-INGESTION-ROADMAP.md` §5; as **regras invioláveis** de canal e tipo, idem. Os
  documentos novos referenciam e acrescentam só o que é próprio deles. A **legenda dos
  marcadores** `[C] [H] [F] [D] [J]` passa a ter uma única definição normativa, em
  `docs/evidence/price-sources/README.md` §6 — `SOURCE-CONNECTOR-STATUS.md` deixou de redefini-la
  e passou a referenciá-la.
- **Consequência:** nenhum item do MVP muda. Nenhum schema nasce. Nenhum card sai de Inbox ou
  Bloqueado. `[J]` (revisão jurídica pendente) passa a existir como marcador.
- **Documentos:** os três criados, mais referências em `MVP-DATA-CONTRACT.md`,
  `PROMOTION-TYPES.md`, `CANONICAL-PRODUCT-SPEC.md`, `AUTOMATED-PRICE-INGESTION-ROADMAP.md`,
  `SOURCE-CONNECTOR-STATUS.md`, `TRELLO-MAPPING.md`, `TECHNICAL-DEBT-REGISTER.md`, `INDEX.md`
- **Status:** ativa

### DL-019 — Baseline operacional e guia do Trello

- **Data:** 03/08/2026
- **Decisão:** o quadro **ViPreço — MVP Artemis**
  ([trello.com/b/ThzNvV2Y](https://trello.com/b/ThzNvV2Y/vipreco-mvp-artemis), workspace
  `Área de trabalho do Trello`) é o quadro oficial e único do projeto. A **`main` do GitHub é a fonte
  normativa; o Trello representa a execução.** A sincronização usa o **ID oficial** do card como
  chave, é **idempotente** e **não destrutiva**. Cards sem ID permanecem **UNMAPPED**, preservados e
  não reinterpretados. `Em desenvolvimento` é a lista oficial; `Em andamento` foi **arquivada**.
  Existem **onze etiquetas oficiais**. `MVP-DATA-02` está em `Ready`; `MVP-E3-04` permanece no
  `Backlog aprovado`; **R1 continua não iniciado**.
- **Contexto:** o mapa do quadro existia desde R0.6, mas o quadro real não. R0.7 populou o Trello com
  os 56 cards oficiais derivados de `TRELLO-MAPPING.md`, preservou os 19 cards manuais anteriores,
  arquivou a lista vazia duplicada e aplicou as onze etiquetas. Sem um guia, um quadro com 75 cards e
  20 etiquetas é ilegível para quem chega depois — daí `pmo/trello/README.md`.
- **Por que ID como chave, e não título:** título parecido não é o mesmo item. Reconciliar por
  semelhança faz um card manual ser silenciosamente tratado como oficial, e o histórico do Founder
  desaparece dentro de um item de execução. Com ID, o que não casa vira **UNMAPPED** — registro, não
  suposição.
- **Por que não destrutiva:** o quadro tinha trabalho humano anterior à sincronização. Apagar o que
  não é reconhecido troca um problema visível (cards a mais) por um invisível (contexto perdido).
- **Por que `Em andamento` foi arquivada, e não apagada:** estava **vazia** e duplicava o significado
  de `Em desenvolvimento`. Arquivar é reversível; apagar não é.
- **Por que MVP-DATA-01 está em `Bloqueado` e não em `Concluído`:** o PR #47 foi mergeado, mas o gate
  do card é **aplicar a migration**, e ela não foi aplicada. **Card fecha quando o gate fecha, não
  quando o PR mergeia.** Regra geral, não exceção deste card.
- **Alternativas:** (a) quadro novo do zero, descartando os cards manuais — rejeitada: destrói o
  histórico do Founder; (b) reconciliar por similaridade de título — rejeitada, ver acima; (c) só o
  mapa, sem quadro real — rejeitada: era o estado anterior, e ninguém enxergava a execução; (d) guia
  dentro do próprio `TRELLO-MAPPING.md` — rejeitada: o mapa é lista de cards, o guia é operação;
  misturar torna os dois piores.
- **Limitação do conector, registrada:** a integração de Trello disponível **não expõe função de
  renomear quadro nem de criar etiqueta**. As onze etiquetas foram criadas **manualmente** pelo
  Founder; **anexar** etiqueta funciona por ferramenta, e foi assim que os 56 cards foram etiquetados.
- **Consequência:** nenhum item do MVP muda. Nenhum schema nasce. Nenhum card entra em
  `Em desenvolvimento`. Nenhum card `POST-MVP` entra em `Ready`. R1 continua dependendo de
  autorização do Founder/PMO.
- **Documentos:** `pmo/trello/README.md` (criado), `TRELLO-MAPPING.md`, `INDEX.md`
- **Status:** ativa

### DL-020 — R2 versionado antes da aplicação remota

- **Decisão:** as migrations de R2 **podem existir e ser mergeadas na `main`**, e o merge
  **não** equivale à aplicação. Nenhuma migration é aplicada em ambiente remoto sem gate
  humano do Founder/PMO. Auditoria read-only precede a aplicação; backfill exige revisão
  linha a linha; `parsed` nunca vira `confirmed` automaticamente; constraints nascem
  nullable ou `NOT VALID` quando apropriado, e a validação é etapa separada; preço unitário
  não é persistido; `products.gtin` continua sendo a persistência de `primary_gtin` no MVP;
  `product_identifiers` permanece fora do MVP.
- **Contexto:** R2 entregou três PRs — [#54](https://github.com/samuel3ssilva/vipreco/pull/54)
  (identidade e quantidade estruturadas), [#55](https://github.com/samuel3ssilva/vipreco/pull/55)
  (integridade de GTIN) e [#56](https://github.com/samuel3ssilva/vipreco/pull/56) (preview
  read-only de backfill). Mergeados nesta ordem em 04/08/2026. `main` em `56140df`, dez
  migrations versionadas, **nenhuma aplicada**.
- **Por que merge não é aplicação:** o Git é o lugar onde a migration é revisável,
  versionada e testável. O banco é onde ela vira irreversível. Confundir os dois transforma
  aprovação de código em autorização de operação, e são decisões de pessoas diferentes:
  escrever migration é trabalho do CTO, aplicar é decisão do Founder/PMO (princípio 14 do
  `CLAUDE.md`). Foi confirmado por auditoria que **nenhuma automação do repositório aplica
  migration nem faz deploy em push para `main`**: os dois workflows de deploy são
  `workflow_dispatch`, e o de produção ainda exige uma string de confirmação exata.
- **Por que `NOT VALID` e por que nullable:** o conteúdo de `products` em staging e em
  produção **nunca foi consultado** — não há credencial, e o mandato proíbe conectar.
  Constraint validada na criação faria a aplicação inteira falhar por uma linha antiga;
  `NOT VALID` passa a valer para escrita nova imediatamente e adia a conferência das linhas
  existentes para um passo que **pode falhar de propósito**. Coluna `NOT NULL` quebraria
  toda linha existente; a obrigatoriedade é o estado final, depois do backfill revisado, em
  outra migration com outro gate.
- **Por que quantidade normalizada não virou coluna:** o contrato marca `normalized_quantity`
  e `normalized_unit` como **derivados**. Duplicar dado derivável cria um segundo lugar onde
  o valor pode envelhecer. O índice de identidade exata é de **expressão**: calcula a
  conversão no momento de indexar. É o que faz `500 g` e `0,5 kg` colidirem por conta, e não
  por coincidência de string — provado contra Postgres vivo no drill de CI.
- **Achado que corrigiu um documento normativo:** o comentário da migration de R2-B afirmava
  que a expressão de um `CHECK` não exigiria `EXECUTE` de quem escreve. **Era falso.** Um
  papel com `INSERT` em `products` e sem `EXECUTE` em `pa_is_valid_gtin` recebe
  `permission denied for function` em toda escrita, inclusive com `gtin` nulo. A consequência
  é **operacional, não de segurança** — a constraint fica mais restritiva do que o
  documentado, nunca menos, e nenhum papel real é afetado hoje. Mas o backfill precisa ser
  feito como `service_role`, e isso está no runbook. O comentário foi corrigido e a
  afirmação virou assertion do drill, com os dois lados do contraste.
- **Alternativas:** (a) segurar as migrations fora da `main` até a autorização de aplicação
  — rejeitada: tira do Git exatamente o que precisa ser revisado, e o custo de revisão sobe
  quando o momento é o de aplicar; (b) aplicar em staging junto com o merge — rejeitada:
  transforma revisão de código em autorização de operação; (c) validar as constraints na
  criação — rejeitada: falha a aplicação inteira por uma linha antiga, e sem consultar o
  ambiente não há como saber se existe; (d) persistir a quantidade normalizada — rejeitada,
  ver acima.
- **Docker local:** permanece **NOT VERIFIED**. O `db-schema-drill` verde em CI, com
  Postgres 16 real e reconstrução do schema desde banco vazio, é aceito como prova para
  revisão e merge das migrations nesta fase. Não se força Docker local com risco de ENOSPC.
- **Registro de imprecisão preservada:** a mensagem do commit original de R2-B menciona
  “645 → 651 testes”, com baseline incorreto — a contagem correta parte da `main` com 629.
  O histórico publicado **não foi reescrito** (sem `amend`, sem `rebase`, sem `force-push`);
  a correção factual está no corpo do PR #55 e aqui.
- **Consequência:** nenhum item do MVP muda de escopo. Nenhuma migration é aplicada. Nenhum
  backfill é executado. MVP-E1-01, E1-02, E1-05 e E1-08 permanecem em `Bloqueado` — **card
  fecha quando o gate fecha, não quando o PR mergeia**, a mesma regra de DL-019.
- **Documentos:** `data/R2-ROLLOUT-RUNBOOK.md` (criado), `data/R2-APPLICATION-GATE.md`
  (criado), `scripts/r2/README.md` (criado), `scripts/r2/target-readiness.sql` (criado),
  `INDEX.md`
- **Status:** ativa
- **Corrigida em 04/08/2026 por DL-022** no ponto “o conteúdo de `products` em staging nunca
  foi consultado”. Passou a haver medida para **staging**; para **produção** a afirmação
  continua verdadeira.

---

### DL-021 — Contagem real do quadro Trello, medida e discriminada

- **Decisão:** a contagem de cards do quadro passa a ser registrada **discriminada por
  categoria**, e não como um número único de “UNMAPPED”. A medição de 04/08/2026 substitui
  o número de 19 registrado em DL-019.
- **Medição (04/08/2026, quadro `ViPreço - MVP Artemis`):**

  | Categoria                                                                      | Quantidade |
  | ------------------------------------------------------------------------------ | ---------- |
  | cards oficiais com ID `MVP-…` / `POST-MVP-…`                                   | 42         |
  | cards oficiais da trilha pós-MVP, com ID `PM-DATA-…`                           | 14         |
  | **subtotal oficial** (bate com os 56 de DL-019)                                | **56**     |
  | cards operacionais de onda, `R0`–`R8`, criados manualmente                     | 9          |
  | cards do próprio Trello (lista “Guia de introdução ao Trello”)                 | 7          |
  | outros cards manuais (2 em `Ideias`, 1 em `Precisa validar`, 1 em `Concluído`) | 4          |
  | **subtotal não oficial**                                                       | **20**     |
  | **total aberto**                                                               | **76**     |
  | arquivados                                                                     | 1          |
  | **total geral**                                                                | **77**     |

- **Por que 19 estava errado:** o número tratava como uma categoria só o que são três — os
  cards de onda `R0`–`R8` (trabalho do Founder), os cards que o próprio Trello cria ao abrir
  um quadro, e os cards manuais avulsos. Um número agregado não permite responder a pergunta
  que interessa: _o que aqui é trabalho e o que é ruído de ferramenta?_
- **Por que os 14 `PM-DATA-…` contam como oficiais:** eles têm ID e estão no mapeamento; o
  prefixo é diferente porque a trilha é pós-MVP. `42 + 14 = 56` fecha exatamente com o total
  oficial de DL-019, o que confirma que a divergência estava só na classificação do resto.
- **Estado do card “Teste 1”:** **arquivado**, na lista `Ideias`. É o único card arquivado do
  quadro. Arquivar é reversível; não foi apagado, pela mesma razão de DL-019.
- **Consequência:** nenhum card foi criado, apagado ou reclassificado para chegar a estes
  números — eles são o que o quadro tem. Nenhum `POST-MVP` ou não oficial foi alterado nesta
  missão.
- **Documentos:** `TRELLO-MAPPING.md`, `trello/README.md`
- **Delta registrado em 04/08/2026 (R2.2 §15):** criado **MVP-DOCS-07** em `Backlog aprovado`,
  a partir de DL-022. A tabela acima é uma medição datada e não foi reescrita; o efeito é
  `+1` em “cards oficiais”, levando 42 → 43, o subtotal oficial 56 → 57, o total aberto
  76 → 77 e o total geral 77 → 78. Nenhum outro card foi criado, movido ou reclassificado, e
  `Ready` continua vazia.
- **Status:** ativa

---

### DL-022 — Preflight remoto de staging: o que foi medido e por que R2 não foi aplicada

- **Decisão:** o preflight remoto de staging é feito **com a menor credencial que responde à
  pergunta**, e o resultado é registrado com a distinção explícita entre _o que o banco tem_ e
  _o que a medição alcança_. R2 **não** foi aplicada em staging, e a causa raiz é ausência de
  credencial, não prudência discricionária. Nenhuma escrita foi emitida contra ambiente algum.
- **Contexto:** medido em 04/08/2026, com `main` em `e203887`. A auditoria usou **somente**
  `GET`/`HEAD` na Data API pública de staging, com a chave _publishable_ (anônima) — a mesma
  que qualquer visitante carrega. Evidência completa em `evidence/r2/staging/`.
- **Gate G1–G15:** 8 `PASS`, 3 `UNKNOWN`, **4 `FAIL`** (G3 histórico, G6 backup, G8 GTIN,
  G15 credencial). O §10 do mandato exige `PASS` em todos os quinze; portanto a aplicação
  não estava autorizada e não ocorreu.
- **Por que a causa raiz é uma só:** não existe neste ambiente `SUPABASE_SERVICE_ROLE_KEY`,
  senha de banco, `SUPABASE_ACCESS_TOKEN` nem a CLI `supabase`. Sem isso não há como escrever
  **nem como ler o catálogo do sistema** — e é do catálogo que vêm o histórico de migrations
  (G3), os índices, constraints, funções, policies e grants (G4) e as linhas inativas (G5).
  Três dos quatro `FAIL` são consequência da mesma ausência. Nenhuma credencial alternativa
  foi criada, e nenhum segredo foi pedido no chat.
- **O que a Data API pública provou mesmo assim:** as colunas de `products`, `markets` e
  `prices` batem **exatamente** com o esperado depois das oito migrations anteriores a R2 — o
  `GRANT SELECT` é de tabela inteira, então o conjunto devolvido _é_ o conjunto de colunas. E
  as quatro colunas de R2-A respondem `42703` (_undefined_column_), não `42501`
  (_insufficient_privilege_): o erro diz que a coluna **não existe**, e não que existe e está
  negada. É essa distinção que transforma a leitura em prova.
- **Achado sobre o dado, e não sobre a medição:** dois produtos fictícios em staging
  (`…000000000002` e `…000000000007`, Café Pilão 500 g e 250 g) carregam GTIN com dígito
  verificador GS1 inválido. São **os mesmos dois** que o commit `1102967` (PR #53, 03/08/2026)
  anulou no `supabase/seed.sql`. Staging foi semeado em 27/07 e nunca re-semeado: o
  repositório está certo, o ambiente está velho. **Não é curadoria de GTIN** — o valor correto
  para essas duas linhas já foi decidido, está versionado, e é a ausência de código.
- **Por que isso bloqueia R2-B, e o que exatamente ele bloqueia:** aplicar R2-B **passaria**,
  porque a constraint nasce `NOT VALID` e `NOT VALID` não confere linha existente. Quem
  falharia é a **FASE 6**, no `VALIDATE CONSTRAINT` — exatamente o que aquele commit previu:
  _“no dia em que essa constraint existir o próprio seed deixa de aplicar”_. O Gate G8 antecipa
  essa falha para um relatório, em vez de deixá-la aparecer numa janela de manutenção.
- **Correção factual a DL-020:** aquela entrada registra que o conteúdo de `products` em
  staging e em produção “nunca foi consultado”. Isso **deixou de ser verdade para staging** em
  04/08/2026, na medida descrita aqui. Continua verdadeiro para **produção**, cujo banco não
  foi contatado em nenhum momento — a única interação com produção foi um `GET` no Worker
  público. DL-020 não foi reescrita; esta entrada é a correção, como DL-017 fez com DL-016.
- **Backup (G6):** nada mudou desde a Onda 4 — plano Free, **nenhum backup automático existe**.
  O risco segue aceito enquanto o banco só tiver dado fictício, e deixa de ser aceitável no dia
  em que houver dado de piloto. Ressalva nova: reconstruir staging pelas migrations e pelo seed
  produziria o seed **corrigido**, não uma cópia de staging — “reconstruível” e “idêntico” não
  são a mesma afirmação, e só a primeira é verdadeira.
- **Alternativas:** (a) aplicar mesmo assim, já que `NOT VALID` passaria — rejeitada: passar na
  aplicação e falhar na validação é o pior dos dois mundos, porque troca um relatório barato
  por uma falha cara; (b) corrigir os dois GTINs — impossível aqui (é escrita, sem credencial)
  e, mesmo com credencial, é decisão do Founder; (c) pedir a credencial no chat — proibido pelo
  mandato e pelo princípio 6 do `CLAUDE.md`; (d) tratar `UNKNOWN` como `PASS` porque “o
  provável é que esteja tudo certo” — rejeitada: é precisamente a verificação que mede a coisa
  errada e responde OK.
- **`db-schema-drill` como required check:** **não** foi tornado obrigatório. A escrita na
  proteção da `main` foi negada pela camada de permissão da sessão, e — mais importante —
  aplicá-la sozinha seria errado: o workflow é filtrado por caminho, e um required check que
  não é reportado deixa todo PR documental pendente para sempre. Medido nos PRs #58 (drill
  presente), #48 e #60 (ausentes). A ação humana completa está em
  `evidence/r2/branch-protection.md`. A proteção da `main` **não foi alterada**.
- **Consequência:** nenhuma migration aplicada, nenhum backfill, nenhum `VALIDATE CONSTRAINT`,
  nenhum `NOT NULL`, nenhuma RLS, nenhum deploy, nenhum dado real. Staging segue no deployment
  `862a179` e produção em `b88e514`. MVP-E1-01, E1-02, E1-05 e E1-08 permanecem em `Bloqueado`.
- **Documentos:** `evidence/r2/README.md` (criado), `evidence/r2/branch-protection.md` (criado),
  `evidence/r2/staging/README.md` (criado), `evidence/r2/staging/preflight.md` (criado),
  `evidence/r2/staging/application.md` (criado), `data/R2-APPLICATION-GATE.md`, `INDEX.md`,
  `TRELLO-MAPPING.md` (card **MVP-DOCS-07**, criado em `Backlog aprovado` — nunca em `Ready`)
- **Status:** ativa

---

### DL-023 — O required check que não podia ser exigido, e o preflight que virou workflow

- **Data:** 04/08/2026 · **Origem:** mandato R2.3 · **Decide:** CTO, sob mandato do Founder/PMO
- **Evidência:** `evidence/r2/branch-protection.md` e `evidence/r2/automation.md`
- **Contexto:** DL-022 fechou R2.2 com dois bloqueios de ferramenta, não de banco. O
  `db-schema-drill` não era required check, e não existia caminho seguro para ler o catálogo de
  staging. Os dois foram resolvidos aqui, e nenhum deles do jeito óbvio.

**1. O `db-schema-drill` é required check desde os PRs #62 e #63.**

A versão óbvia — exigir o check como ele estava — teria trancado a `main` para todo PR que não
mexe em migration. O workflow tinha filtro `paths:`, e workflow filtrado por caminho **não é
executado e não é reportado**; um required check que nunca é reportado não fica verde por
omissão, fica pendente para sempre. Medido nos PRs #58 (presente), #48 e #60 (ausentes), e na
`main` entre `e203887` e `a0be553`.

A distinção que decide: job pulado por `if:` reporta `skipped`, e o GitHub aceita `skipped`.
Workflow pulado por `paths:` não reporta nada. Só o segundo trava.

E travar não seria o pior. Com `enforce_admins = false`, cada PR de documentação viraria um
merge por bypass de administrador — bypass rotineiro deixa de ser exceção e vira o
procedimento.

A correção separou o barato do caro: um detector que sempre roda, o drill pesado só quando há
schema a reconstruir, e um **gate que sempre reporta** (`db-schema-drill-required`) consolidando
os dois. O detector falha para o lado seguro — sem base de comparação confiável, o drill roda.

A proteção foi montada a partir da leitura da proteção vigente, e os dois estados comparados
campo a campo depois: **só a lista de checks mudou**, e só por acréscimo. `strict`, aprovações,
`enforce_admins`, force push e deleção seguem exatamente como estavam.

**2. O preflight remoto de staging virou workflow manual e read-only.**

A R2.2 mediu staging com a chave anônima e bateu no teto dela. Índices, constraints, funções,
policies, grants, linhas inativas e o histórico de migrations são invisíveis para `anon` — e
isso é o comportamento correto. G3, G4 e G5 ficaram indeterminados pela **medição**, não pelo
banco.

`r2-staging-preflight.yml` fecha essa lacuna: só `workflow_dispatch`, environment `staging`,
`permissions: contents: read`, concorrência exclusiva, timeout. **Não existe modo `apply`**, e
isso é desenho — escrever em staging é missão própria, com gate próprio.

A garantia de read-only é estrutural e tem três camadas independentes, porque a suposição
perigosa seria "a credencial é read-only" — ela não é: o único papel que enxerga o histórico de
migrations também escreve em tudo. As camadas são a estática (nenhum verbo de escrita nos
`.sql`, verificada também **dentro** do workflow, antes de abrir conexão), a transacional
(`BEGIN; SET TRANSACTION READ ONLY;`) e a de verificação (o banco confirma, e o runner aborta se
a resposta não for `on`).

Produção é inalcançável **por recusa**, não por omissão: o runner lê os dois project refs do
`config/environments.json` versionado e aborta se a URL apontar para produção, se não confirmar
que é staging, ou se não conseguir ler os refs. O terceiro caso não é zelo — sem ele a guarda
falharia aberta, e uma checagem que parece existir é pior do que nenhuma.

O workflow **não instala a CLI do Supabase**, de propósito: o histórico sai de `SELECT` direto,
e assim o runner nunca carrega uma ferramenta que também saiba aplicar migration.

- **Alternativas rejeitadas:** (a) exigir o check como estava e mergear documentação por bypass
  de admin — rejeitada, ver acima; (b) manter `enforce_admins = true` como saída — não resolveria
  nada: o PR continuaria pendente, e ninguém conseguiria mergear; (c) pedir ao Founder que rode
  SQL à mão e cole a saída — rejeitada pelo mandato, e pior tecnicamente: o read-only passaria a
  depender de quem executa colar a consulta certa; (d) usar a CLI do Supabase por conveniência —
  rejeitada: carregaria capacidade de escrita num job que só precisa ler.
- **O que não muda:** nada disso aplica migration. O gate de `R2-APPLICATION-GATE.md` continua
  fechado e continua sendo decisão do Founder/PMO, ambiente por ambiente (princípio 14).
- **Estado:** o segredo `SUPABASE_DB_URL` **não existe** no Environment `staging` — verificado
  pela presença do nome, nunca pelo valor. O workflow foi disparado uma vez, deliberadamente sem
  o segredo, e parou em `STAGING DATABASE SECRET REQUIRED` sem abrir conexão: valida a mecânica,
  não mede o banco. Nenhuma auditoria remota foi executada.
- **O bloqueio mudou de natureza:** de `CREDENTIAL ACCESS REQUIRED`, que era sobre não haver
  caminho, para `STAGING SECRET REQUIRED`, que é sobre uma decisão do Founder ainda não tomada.
- **Não reabre:** os achados de DL-022 seguem de pé, inclusive os dois GTINs inválidos em
  staging — que não são curadoria pendente, e cuja correção continua sendo escrita, logo continua
  sendo decisão do Founder/PMO.
- **Consequência:** nenhuma migration aplicada, nenhuma escrita, nenhum backfill, nenhum
  `VALIDATE CONSTRAINT`, nenhum `NOT NULL`, nenhuma RLS, nenhum deploy, nenhum dado real. Staging
  segue em `862a179` e produção em `b88e514`; o banco de produção não foi contatado. MVP-E1-01,
  E1-02, E1-05 e E1-08 permanecem em `Bloqueado`.
- **Documentos:** `evidence/r2/automation.md` (criado), `evidence/r2/branch-protection.md`
  (reescrito — a medida dos PRs #58/#48/#60 foi preservada, porque é a razão do desenho),
  `evidence/r2/README.md`, `data/R2-APPLICATION-GATE.md`, `data/R2-ROLLOUT-RUNBOOK.md` (FASE 1),
  `INDEX.md`, `TRELLO-MAPPING.md` (**MVP-DOCS-07** concluído)
- **Status:** ativa

---

### DL-024 — North Star visual do MVP: a imagem é direção, a `main` é a lei

- **Data:** 05/08/2026 · **Origem:** mandato R3.0 · **Decide:** Founder; registrado pelo CTO
- **Evidência:** `product/visual-north-star/vipreco-mvp-north-star.png`
  (SHA-256 `7b7a28b5…cbb858`, 1448 × 1086, 1 741 410 bytes, sem recompressão)
- **Contexto:** o produto tinha contratos funcionais fechados (identidade exata, comparação,
  card v2, política de imagem) e nenhuma referência visual aprovada. Cada tela implementada
  reabria a discussão de forma, cor e densidade do zero, e "parecido com o que imaginei" não é
  critério revisável.

**A decisão.** A imagem anexada pelo Founder é a **direção visual oficial** do MVP. O GitHub
`main` continua sendo a **fonte normativa funcional**. Fidelidade visual deve ser alta;
fidelidade **funcional** deve ser total.

**A distinção que faz a decisão valer alguma coisa:** o conteúdo da imagem é **ilustrativo**.
Mercados, bairro, cidade, preços, promoções, datas, GTINs, logotipos e imagens de produto que
aparecem nela não são reais e não podem entrar no produto. A imagem mostra São Luís-MA; o piloto
é em Artemis, Piracicaba-SP. Um mockup que vira dado é risco jurídico e de confiança, não
detalhe estético.

**Seis conflitos entre a imagem e os contratos foram identificados e registrados** antes de
qualquer implementação, justamente para que ninguém os "resolva" implementando o que viu:
preço unitário exibido sem quantidade estruturada; preço anterior sem histórico; barra de cinco
abas; "Favoritos"; sino de notificação; logotipos de rede. Em todos, ganham os contratos.

**Ordem de execução:** Card v2 **precede** a Home. O primeiro PR visual trata só de tokens,
tipografia, espaçamento, primitivas e um laboratório isolado — e **não altera a Home**. Token
novo aplicado direto na Home mistura, num só diff, "a fundação mudou" com "a tela mudou"; quando
algo regride, não há como saber qual dos dois causou.

**Screenshots são evidência obrigatória** por tela, em 360 px e desktop, e **Founder Review é
Gate obrigatório** para cada uma. Sem screenshot, a revisão de fidelidade visual vira confiança
cega. Nenhuma implementação visual começa antes de autorização específica.

- **Alternativas descartadas:** (a) tratar a imagem como especificação literal — produziria os
  seis conflitos acima, em silêncio, porque o resultado pareceria certo; (b) não registrar a
  imagem e seguir só por contrato — devolveria a discussão de forma a cada tela; (c) reproduzir
  o conteúdo do mockup no fixture demo — inventaria mercados e preços com aparência de reais.
- **Consequências:** três documentos normativos novos; toda tela passa a ter Gate explícito; o
  primeiro PR visual fica deliberadamente sem efeito visível na Home.
- **Riscos:** implementar por semelhança em vez de por contrato; a imagem envelhecer e virar
  referência morta; o `FeaturedOfferCard` virar ranking editorial se o critério de destaque não
  for objetivo — enquanto não houver critério escrito e testado, a Home vai sem destaque.
- **Pendência registrada, não resolvida:** o roadmap do mandato põe Card v2 em R3.2 e Home em
  R3.3; o `MVP-EXECUTION-PLAN.md` põe MVP-DESIGN-03 em R6 e MVP-DESIGN-05 em R4. **Não alterei
  a etapa de nenhum card** — reescrever o plano de execução por conta própria seria trocar a
  fonte normativa por uma leitura minha. Até haver decisão, vale o plano.
- **Documentos:** `product/VISUAL-IMPLEMENTATION-CONTRACT.md` (criado),
  `product/R3-SCREEN-SPEC.md` (criado), `product/R3-COMPONENT-INVENTORY.md` (criado),
  `product/visual-north-star/vipreco-mvp-north-star.png` (criado), `INDEX.md`
- **Status:** ativa

---

### DL-025 — Segredo atômico: a credencial de staging deixou de ser uma URI montada à mão

- **Data:** 05/08/2026 · **Origem:** mandato R2.3D · **Decide:** Founder/PMO; executado pelo CTO
- **Evidência:** `evidence/r2/automation.md` §8D · `scripts/r2/preflight/prepare-credential.sh`
- **Contexto:** três missões seguidas (R2.3B, R2.3C e a retomada) terminaram em
  `password authentication failed`, e em todas a investigação começou pelo mesmo lugar: _o valor
  cadastrado está certo?_ Em R2.3B a resposta foi **não, o valor estava certo e o runner estava
  errado** — cinco vezes, e nenhum dos cinco defeitos falhava: todos entregavam uma senha
  silenciosamente diferente.

**A decisão.** O Environment Secret operacional passa a ser **`SUPABASE_DB_PASSWORD`**, contendo
**somente a Database password** de staging. Host, porta, usuário e banco são derivados de
`config/environments.json`. `SUPABASE_DB_URL` sai do caminho de execução.

**O argumento não é "o parser estava ruim".** Daqueles cinco campos da URI, quatro já eram
conhecidos e versionados e só um era segredo. Montar os quatro conhecidos à mão, para
decompô-los de volta em seguida, criava superfície de erro do nada — e um segredo composto tem
uma propriedade que teste nenhum conserta: **ele não distingue "senha errada" de "URI montada
errada"**. As duas falham no mesmo ponto, com a mesma mensagem, e mandam investigar o banco. Um
segredo atômico não tem essa ambiguidade porque não tem o que montar.

**O que foi eliminado, e não apenas corrigido:** parser de URL, detecção percent-encoded,
extração de senha, base64, decode, `.pgpass` alternativo e a segunda tentativa de conexão.
Nenhum caminho de autenticação em paralelo sobrou — sem o segredo novo o job encerra em
`STAGING DATABASE PASSWORD SECRET REQUIRED` e não tenta mais nada.

**Uma guarda que se executa.** A cadeia de recusa (refs ausentes, refs iguais, host contaminado
pelo ref de produção) virou `preparar_credencial()`, uma função com nome cujo teste a **roda de
verdade** em vez de casar regex sobre o texto do script. É a lição da quinta falha aplicada em
vez de reaprendida: as duas pontas estavam testadas, e o defeito morava na costura.

**Recusar em vez de consertar.** Espaço, tabulação ou quebra de linha nas pontas do segredo
abortam com mensagem própria. Aparar em silêncio produziria uma senha diferente da cadastrada —
exatamente a família de defeito que a decisão elimina.

- **Alternativas descartadas:** (a) escrever um parser ainda melhor — trata o sintoma e mantém a
  ambiguidade estrutural; (b) manter os dois segredos com fallback — reintroduziria os dois
  caminhos paralelos e tornaria o erro de novo indistinguível; (c) pedir a senha em chat ou
  usar `service_role` — proibido pelo mandato e desnecessário; (d) inferir o host de um segredo
  separado — devolveria ao segredo um campo que já é público e versionado.
- **O que não muda:** nada disso aplica migration. O gate de `data/R2-APPLICATION-GATE.md`
  continua fechado e continua sendo decisão do Founder/PMO, ambiente por ambiente (princípio 14).
  Os dois GTINs inválidos em staging seguem não sendo curadoria pendente.
- **Estado:** nenhuma execução do preflight nesta missão. O segredo novo é verificado **pelo
  nome**, e enquanto não existir o workflow não roda. Nenhuma conexão foi aberta, nenhuma
  escrita emitida, produção não contatada. Staging segue em `862a179`, produção em `b88e514`.
- **Documentos:** `evidence/r2/automation.md` (§8D; a ação mínima da §8C fica marcada como
  superseded, e as medições preservadas), `data/R2-APPLICATION-GATE.md`,
  `data/R2-ROLLOUT-RUNBOOK.md`, `scripts/r2/preflight/README.md`
- **Status:** ativa

### DL-026 — Privilégio público: a auditoria lia migrations, e o banco tinha outra coisa

- **Data:** 2026-08-05
- **Contexto:** a `DATABASE-AUTHORIZATION-MATRIX.md` da Onda 3 afirmava que `anon` e
  `authenticated` não tinham UPDATE nem DELETE em tabela nenhuma. A afirmação era derivada de
  leitura das migrations — o próprio documento diz isso no cabeçalho. R2.5 mediu staging pela
  primeira vez e achou 45 dos 48 privilégios de tabela concedidos aos dois papéis públicos. Os
  3 ausentes eram exatamente os 3 `REVOKE INSERT` da Onda 3.
- **Decisão:** duas migrations de revogação, `20260803005000` (tabelas centrais) e
  `20260803007500` (tabelas de contribuição), e a correção explícita do documento que estava
  errado — sem apagá-lo, porque o erro e sua causa são a parte útil.

**A causa não foi desatenção; foi a fonte.** Toda auditoria anterior perguntou ao repositório o
que o repositório concede. A plataforma Supabase concede por fora, via `ALTER DEFAULT PRIVILEGES
... GRANT ALL ON TABLES`, e nenhuma leitura de migration jamais veria isso. A mesma classe de
ponto cego já havia produzido o achado crítico da Onda 3 nas funções — e a lição foi aplicada só
às funções, porque foi só ali que alguém olhou.

**TRUNCATE é o achado, e os outros três não são.** Para INSERT, UPDATE e DELETE a RLS nega a
operação mesmo com o privilégio, então o excesso era defesa em profundidade perdida. **A RLS não
se aplica a TRUNCATE**: não existe policy que o negue, e o privilégio é a barreira inteira. O
único motivo pelo qual `anon` não apagava `prices` era o PostgREST não expor verbo para a
operação. Proteção que depende de o cliente não conseguir pedir não é proteção.

**O contrato das tabelas de contribuição foi resolvido para "nada".** A regra aprovada era
preservar INSERT só onde houvesse policy ativa **e** contrato funcional que ainda permitisse
submissão pública. As três têm policy — dormente — e nenhuma tem contrato: o `CLAUDE.md`,
princípio 5, é explícito. SELECT também não se sustentou: nenhuma delas tem policy de SELECT e
nenhum caminho do aplicativo as lê. Sem nada a preservar, `REVOKE ALL PRIVILEGES`.

**Herança futura cortada, e a consequência é deliberada.** `REVOKE ALL ON TABLES` no default
privilege significa que tabela nova em `public` não dá nada a `anon` por herança — toda tabela
publicamente legível passa a exigir `GRANT SELECT` explícito. Já era o padrão do repositório, e
falhar fechado é a direção certa: tabela nova que não aparece na API é um bug óbvio de dois
minutos; tabela nova exposta sem ninguém ter decidido é este achado.

**O que impede a correção de repetir o erro que corrige.** Um controle positivo. O drill cria
uma tabela no baseline, sob o mesmo default privilege das seis reais, e nenhuma migration a
toca. Privilégio presente nela e ausente nas seis é a prova de que a revogação é **efeito das
migrations**. Sem esse par, "`anon` não tem DELETE" passa idêntico num banco endurecido e num
banco que nunca teve o grant — e foi assim que o drill ficou verde por dois meses.

**Um teste antigo carregava a crença errada.** `close-public-write-surfaces.test.ts` tratava
PUBLIC como sinônimo de "qualquer papel" nos dois sentidos, então um `REVOKE ... FROM PUBLIC`
apagava, no modelo, o grant direto de `service_role`. Isso é falso no Postgres, e é exatamente a
crença que custou caro na Onda 3. A migration nova fez o teste reprovar; o defeito era do
modelo, não da migration.

- **Alternativas descartadas:** (a) revogar só UPDATE/DELETE/TRUNCATE e manter SELECT — manteria
  privilégio sem contrato nem documento, contra a regra aprovada; (b) uma migration só para as
  seis tabelas — misturaria dois escopos de revisão num gate só; (c) `ALTER DEFAULT PRIVILEGES`
  sem `FOR ROLE` — roda, devolve sucesso e pode não desfazer nada, que é o pior resultado
  possível; (d) confiar no drill sem controle positivo — foi o que já falhou.
- **O que não muda:** RLS, policies, dados e `service_role` intactos. Nenhuma migration foi
  aplicada em banco remoto por esta decisão; o gate de `data/R2-APPLICATION-GATE.md` continua
  fechado e continua sendo decisão do Founder/PMO, ambiente por ambiente (princípio 14).
- **Documentos:** `security/DATABASE-AUTHORIZATION-MATRIX.md` (§Correção de R2.5/R2.6),
  `data/R2-APPLICATION-GATE.md`
- **Status:** ativa

### DL-027 — R2 aplicada em staging: uma operação por disparo, e três defeitos do instrumento

- **Data:** 2026-08-05
- **Contexto:** as cinco migrations pendentes estavam na `main` desde R2.5 sem caminho de
  saída — todo o instrumental de R2 era read-only por desenho, e ninguém tinha construído a
  escrita remota.
- **Decisão:** um workflow manual de nove operações, uma por disparo, com frase de
  confirmação própria por operação e verificação de estado antes e depois. Executado até o
  fim: histórico remoto de staging **0 → 12**.

**A ausência de `apply-all` é o desenho, e a sequência provou por quê.** Três dos sete passos
encontraram defeito, e nos três o defeito era do **instrumento**, não do ambiente. Com uma
operação única, os três teriam aparecido juntos, no meio de uma cadeia de escrita, sem forma
de saber qual estado tinha ficado onde.

**O `plan` pagou o próprio custo antes da primeira escrita.** Ele rodou verde e mostrou as
três tabelas centrais como "não lido" — e "não lido" faz a verificação posterior **pular** a
comparação. A guarda de contagem parecia existir e não existia.

**Uma migration transacional que falha reverte o que já tinha dado certo.** O hardening
central morreu em `permission denied to change default privileges`, e com ele voltaram as
revogações de tabela — que são o achado P0. Medir o papel respondia _"qual papel"_; não
respondia _"posso alterar esse papel"_. A correção trata a falta de permissão por papel e
registra o resíduo, em vez de trocar a correção crítica por uma proteção acessória.

**Um gate que só existe acoplado à aplicação é irrepetível.** G7-POST reprovou por defeito
próprio com R2-A já aplicada, e migration aplicada não se reaplica. Sem mover G7 também para
o `validate`, a única saída seria inventar uma operação de escrita para contornar um gate — o
oposto do que o workflow existe para impedir.

**A ordem não era preferência.** A remediação dos GTINs veio antes de R2-A porque R2-B cria a
constraint que eles violam; os hardenings vieram depois da normalização porque o índice de
identidade de R2-A é funcional sobre `pa_normalize_text()`. Nenhuma dessas duas ordens é
recuperável depois.

- **Alternativas descartadas:** (a) aplicar por SQL direto no painel — foi o que produziu um
  banco correto com histórico vazio, o problema que R2.5 passou uma missão inteira medindo;
  (b) inserir linhas à mão na tabela de histórico — produziria um histórico que a própria CLI
  não reconhece como seu; (c) `db push` sem limitar — aplicaria as cinco de uma vez e os
  checkpoints deixariam de existir; (d) senha em `--db-url` — `argv` é visível para qualquer
  processo da máquina.
- **O que não muda:** nenhum backfill, nenhum `VALIDATE CONSTRAINT`, nenhum deploy, nenhum
  dado real. **O banco de produção não foi contatado uma única vez** — o Environment
  `production` não carrega segredo de banco.
- **Documentos:** `evidence/r2/staging-apply-r26.md`, `data/R2-APPLICATION-GATE.md`,
  `data/R2-CONTROLLED-APPLY-RUNBOOK.md`
- **Status:** ativa

### DL-028 — Roadmap MVP V2: duas trilhas, e o Card v2 antes da Home

- **Data:** 2026-08-06
- **Contexto:** desde 05/08/2026 conviviam duas ordens contraditórias. O roadmap visual de
  `product/R3-COMPONENT-INVENTORY.md` §2 punha o Card v2 em **R3.2**, antes da Home; o
  `MVP-EXECUTION-PLAN.md` punha o Card v2 em **R6**, depois da busca e da comparação. O
  conflito estava registrado e explicitamente **não resolvido** — resolvê-lo sozinho seria
  reescrever um plano normativo a partir de uma ordem que veio em mandato mas nunca virou
  decisão.
- **Decisão:** vale a **opção A** daquela nota. O Card v2 é R3.2, a Home é R3.3, a busca é R4, a
  comparação é R5, e R6 passa a ser "detalhe, imagens, promoções e estados". Junto disso, o
  roadmap ganha uma **segunda trilha**: B2B-0 a B2B-5, paralela à trilha B2C, registrada em
  `product/ROADMAP-MVP-V2.md`.

**A ordem não é preferência estética.** A Home é uma lista de cards. Desenhar a lista antes da
unidade que a compõe obriga a desenhar duas vezes — e a segunda vez chega depois de a primeira
já ter virado expectativa de alguém.

**A trilha B2B existe porque o piloto depende de mercados que ninguém ouviu ainda.** Ela não é
uma fase do produto do consumidor e não pode ser tratada como tal: `/para-mercados` continua
sendo rota separada, nunca aba do app B2C, e o painel para lojista continua pós-MVP.

- **Alternativas descartadas:** (a) opção B — manter o Card v2 em R6 e corrigir o roadmap
  visual; foi descartada porque R3.1 e R3.2 já foram executadas na ordem nova, e o plano
  descreveria um passado que não aconteceu; (b) deixar o conflito aberto por mais uma rodada —
  ele já custou uma nota de reconciliação em três documentos, e o custo de mantê-lo cresce a
  cada card do Trello que herda a etapa errada.
- **O que não muda:** o escopo. Os três épicos, os habilitadores e a lista fechada de "Fora do
  MVP" continuam em `product/ROADMAP-MVP-v3.md`, incorporados por referência e **não copiados**.
  Nenhum gate foi aberto: produção, backfill, deploy, dado real e contato externo continuam
  fechados.
- **Documentos:** `product/ROADMAP-MVP-V2.md`, `product/ROADMAP-MVP-v3.md` (cabeçalho e §5),
  `product/R3-COMPONENT-INVENTORY.md` §3, `pmo/MVP-EXECUTION-PLAN.md`, `pmo/TRELLO-MAPPING.md`
- **Status:** ativa

### DL-029 — North Star V2: as decisões chegaram, os binários não

- **Data:** 2026-08-06
- **Contexto:** o mandato de 06/08/2026 aprovou o North Star V2 como referência atual de
  produto e design, e informou que os materiais estavam anexados.
- **Decisão:** registrar as **decisões consolidadas** — as dezessete do mandato §3 — em
  `product/NORTH-STAR-V2-ASSESSMENT.md`, com matriz elemento a elemento contra o North Star
  original; e registrar a **ausência dos binários** como ausência, sem criar arquivo nenhum no
  lugar deles.

**Os arquivos não chegaram.** Procurei na mensagem do mandato, em
`product/visual-north-star/`, em `~/Downloads` e `~/Desktop` filtrando por data posterior a
04/08/2026, e no diretório de trabalho da sessão. O que existe é o PNG **original**,
`7b7a28b5…`, inalterado, e cópias de evidências deste próprio repositório.

**Um PNG inventado seria pior que a ausência.** Ele viraria referência de design de alguém, e a
referência seria falsa — exatamente o risco que o contrato visual descreve quando diz que um
mockup que vira dado é risco jurídico e de confiança, não detalhe estético.

**O que decide produto sobreviveu à ausência.** As dezessete decisões vieram escritas e não
dependem de nenhum PNG para valer. Três delas mudam o que já estava no código: cinco abas viram
duas; "confiança da informação" vira quatro dimensões separadas, com relação comercial nunca
disfarçada de procedência; e o histórico de preço sai do Card v2 (DL-030).

- **Alternativas descartadas:** (a) reconstruir os mockups por interpretação do texto — seria
  produzir um North Star autoral e chamá-lo de aprovado; (b) bloquear a missão inteira até os
  arquivos chegarem — as decisões textuais são suficientes para tudo que esta rodada faz.
- **O que não muda:** o North Star original não foi apagado, não será, e continua referenciado
  pelo contrato visual. A hierarquia de autoridade é a mesma para as duas gerações: em conflito
  funcional, ganham os contratos da `main`.
- **Documentos:** `product/NORTH-STAR-V2-ASSESSMENT.md`,
  `product/visual-north-star-v2/README.md`, `product/VISUAL-IMPLEMENTATION-CONTRACT.md`
- **Status:** **superseded na parte dos binários por DL-032**, no mesmo dia. A parte das
  decisões continua ativa.

### DL-030 — O histórico de preço sai do Card v2 até P-01 existir

- **Data:** 2026-08-06
- **Contexto:** o Card v2 do PR #89 exibia "antes R$ 14,90 · 13% mais barato que em 25/07/2026".
  A regra estava correta, testada e alinhada a `data/OFFER-STATES.md` §5 — inclusive na parte
  mais fácil de errar, que é exigir a data ao lado do percentual.
- **Decisão:** remover o preço anterior e a variação percentual do Card v2 e da demonstração.
  Voltam em R6/R8, depois que **P-01 — janela do preço anterior** (card MVP-DOCS-02) for
  decidida.

**O que faltava não era código, era contrato.** "Preço anterior" só significa alguma coisa
depois que alguém disser qual observação anterior conta: a última? a de sete dias atrás? a mais
alta da janela? Sem essa definição, dois cards com o mesmo dado podem exibir percentuais
diferentes e os dois estarem "certos" — e um percentual que ninguém consegue defender é
exatamente o tipo de número que corrói a confiança que o produto existe para construir.

**A regra não foi enfraquecida, foi retirada.** Não sobrou um caminho desligado por
configuração nem um campo escondido atrás de uma flag: quem reintroduzir isso em R6 vai
reintroduzir contra o contrato que P-01 tiver produzido, e não contra uma implementação
adivinhada em agosto.

- **Alternativas descartadas:** (a) manter só no laboratório — o laboratório é o que o Founder
  olha para aprovar; deixar ali é aprovar; (b) manter a função e não renderizar — código morto
  que parece vivo é convite para alguém religá-lo sem ler esta entrada.
- **O que não muda:** `data/OFFER-STATES.md` §5 continua íntegro e continua sendo a spec de
  quando o preço anterior aparece. P-01 continua bloqueando **apenas** R8, como já estava
  registrado.
- **Documentos:** `product/NORTH-STAR-V2-ASSESSMENT.md` §3 item 7,
  `design/R3-2-PRODUCT-CARD-V2-REPORT.md`, `product/CARD-V2-SPEC.md`
- **Status:** ativa

### DL-031 — Kit de entrevistas escrito, campo não iniciado

- **Data:** 2026-08-06
- **Contexto:** MVP-BUSINESS-01 estava em `Bloqueado` com o rótulo "PAUSADO PARA PLANO DE
  DELEGAÇÃO" desde 04/08/2026. O aceite do card sempre exigiu plano e roteiro escritos **antes**
  de qualquer contato.
- **Decisão:** escrever o kit completo — hipóteses, roteiro de 20 a 30 minutos, três pitches,
  folha de entrevista, critérios de sinal, template de síntese e material offline — em
  `business/interviews/`, e **não realizar nenhuma entrevista**.

**Escrever o roteiro é trabalho do CTO; ir a campo é decisão do Founder.** Os dois gates são
diferentes e o segundo não foi aberto. Nenhuma mensagem foi enviada, nenhum mercado foi
contatado, nenhum dado pessoal foi coletado, e o material offline não promete nada que o produto
não tenha: a frase que ele usa é "esta é a experiência que estamos construindo para o piloto".

- **Alternativas descartadas:** (a) esperar a autorização de campo para escrever o material — o
  aceite do card exige a ordem inversa, e por bom motivo: material improvisado na véspera de uma
  conversa é material que promete o que não existe.
- **O que não muda:** contato com pessoa real continua exigindo autorização específica
  (`PLANO-MESTRE.md` §11). B2B-5, o painel para mercados, continua pós-MVP.
- **Documentos:** `business/interviews/README.md`, `product/ROADMAP-MVP-V2.md` §4,
  `pmo/TRELLO-MAPPING.md`
- **Status:** ativa

### DL-032 — Os binários do North Star V2 chegaram, e o que ficou fora do repositório

- **Data:** 2026-08-06
- **Contexto:** DL-029 registrou que as decisões do North Star V2 tinham chegado e os binários
  não, e que nada seria criado no lugar deles. Horas depois, no mesmo dia, o Founder/PMO enviou
  o pacote `vipreco-north-star-v2-fable.zip`
  (`c875d49ec6f4c5d5d2cf3d5954559f874fe1843a404a63eb955b36364fe7018e`, 3 489 401 bytes,
  13 arquivos).
- **Decisão:** versionar **as cinco telas** e **os dois documentos de origem** byte a byte em
  `product/visual-north-star-v2/`, com ficha completa de SHA-256, dimensões, tamanho, origem e
  data; e deixar **quatro arquivos fora do repositório**, cada um com o hash e o motivo escritos
  na ficha.

**O North Star original não foi substituído, e a prova é aritmética.** O PNG que veio dentro do
pacote, em `uploads/`, tem exatamente o mesmo SHA-256 (`7b7a28b5…`) do que já estava versionado
em `product/visual-north-star/`. Era o mesmo arquivo, usado pelo Fable como referência dentro do
documento. Não havia o que substituir, e nada foi duplicado.

**O `ViPreco Redesign.dc.html` ficou fora, e este repositório ser público é a razão.** Ele é o
passo intermediário entre o assessment de UX e o North Star V2, e os mockups dele mostram redes e
marcas reais — uma delas com o selo "★ Parceiro Oficial" do ViPreço —, prova social inventada
("2.317 vizinhos … já recebem") e histórico de preço com percentual. As três coisas foram
corrigidas pelo próprio V2, cuja tabela antes/depois escreve "sem risco jurídico/reputacional;
sem prova social inventada". Versionar o passo anterior num repositório aberto desfaria a
correção no único lugar em que ela fica gravada para sempre, que é o histórico do Git. O arquivo
continua no pacote do Founder, com hash registrado, e voltar atrás é um `cp`.

**O documento não é as cinco telas.** Ele tem oito seções, e três não existem como imagem em
lugar nenhum: os oito estados de ausência, a tabela antes/depois e a classificação de impacto no
roadmap em quatro faixas. Por isso o HTML foi versionado junto, e por isso `fonte/` entrou no
`.prettierignore`: um `bun run format` reformataria os arquivos e invalidaria os hashes da ficha.

**A matriz do assessment foi reconferida contra a fonte e nenhuma linha precisou ser desdita.**
As três células que diziam "não recebida" foram preenchidas com o documento. E ele acrescentou
uma distinção que a matriz não fazia: a "diferença observada" das telas ("R$ 0,50 abaixo da
próxima oferta observada") é a distância para o **segundo mercado da mesma comparação**, não para
um preço passado. Ela não depende de P-01 nem de `price_events`, e portanto **não é** o que
DL-030 removeu.

- **Alternativas descartadas:** (a) versionar o pacote inteiro, inclusive o Redesign e o runtime
  do Fable — publicaria mockups com redes reais rotuladas como parceiras num repositório aberto,
  e 122 KB de JavaScript de terceiro que não é asset do produto; (b) versionar só os PNG — perderia
  os oito estados de ausência, a tabela antes/depois e a classificação de roadmap, que só existem
  no HTML; (c) transcrever os documentos para Markdown em vez de versionar o original — criaria
  duas fontes para o mesmo conteúdo, e a transcrição envelheceria sozinha.
- **O que não muda:** os assets continuam sem autorizar tela nenhuma
  (`product/VISUAL-IMPLEMENTATION-CONTRACT.md` §1 e §4), continuam não sendo fonte de dado, e o
  assessment de UX continua sendo **entrada**, não decisão: várias recomendações dele foram
  rejeitadas pelo V2, e uma delas contraria a neutralidade do `PLANO-MESTRE.md`.
- **Documentos:** `product/visual-north-star-v2/README.md`,
  `product/NORTH-STAR-V2-ASSESSMENT.md` §2 e §3.1, `.prettierignore`
- **Status:** ativa

---

### DL-033 — Evidência publicada envelhece sozinha, e o link fixado não avisa

- **Data:** 06/08/2026
- **Decisão do:** CTO, depois de defeito relatado pelo Founder
- **Contexto:** o Founder baixou a evidência visual direto dos comentários dos PRs #89 e #93 e
  leu nela coisas que o código não fazia: o H1 antigo de `/para-mercados` com a barra do
  consumidor, e o painel do Card v2 com R3.0 como direção aprovada e preço anterior.

**Os arquivos versionados estavam corretos. Os heads estavam corretos. Os comentários estavam
corretos.** O defeito é de processo, e tem duas metades.

**Primeira metade: comentário antigo não morre.** Cada rodada de revisão publicava um comentário
novo, com links `raw.githubusercontent.com` fixados no commit daquele momento. O GitHub serve
esses arquivos **para sempre**, em `200`, byte a byte — e não existe nada no arquivo que diga
que ele envelheceu. Um PR com quatro comentários tem quatro evidências igualmente vivas, e a
única forma de saber qual vale é ler a data do comentário. Medido: `para-mercados-390.png`
tinha três SHA-256 diferentes simultaneamente acessíveis; `card-v2-comparison-board.png`, três.

**Decisão:** um PR tem **um** comentário canônico, intitulado `FOUNDER VISUAL REVIEW — CURRENT
EVIDENCE`. Todo comentário anterior recebe, no topo, um bloco `SUPERSEDED — DO NOT USE FOR
FOUNDER GATE`, e seus links de imagem são **desativados** — a URL vira texto entre crases, e o
`![]()` deixa de renderizar. As URLs continuam escritas, porque o registro importa; ninguém as
abre por acidente, porque o link importa mais.

Apagar os arquivos antigos **não é opção**: eles vivem em commits, e commits são o histórico.
Marcar e desativar é a correção; remover seria reescrever o passado.

**Segunda metade: a captura não era reproduzível.** Recapturar do mesmo commit dava SHA-256
diferente. A diferença toda cabia em 376 linhas de uma imagem de 19 448 — o card de
carregamento, cujo esqueleto usa `animate-pulse`. A foto pegava a pulsação numa fase qualquer.

Isso é pior do que parece: sem reprodutibilidade, "a evidência está velha" e "a captura
simplesmente varia" viram a mesma observação. **Decisão:** `scripts/visual/cdp.ts` congela
`animation` e `transition` imediatamente antes de fotografar, depois da espera de carregamento.
Guardado por `laboratorio-card-v2.contract.test.ts` §"a evidência visual é reproduzível".

- **Consequência:** capturas de gate agora batem byte a byte entre execuções, e o comentário
  canônico registra caminho, commit, SHA-256, URL e head de cada PNG.

---

### DL-034 — R3.2 e B2B-0 aprovadas e mergeadas

- **Data:** 06/08/2026
- **Decisão do:** Founder/PMO, sobre as evidências canônicas reconciliadas por DL-033

O Founder revisou pessoalmente as capturas fixadas nos heads atuais e aprovou os dois gates
visuais. Os dois PRs foram mergeados **separadamente, por merge commit**.

| Frente                   | PR                                                      | Head aprovado | Merge SHA     | Gate                                       |
| ------------------------ | ------------------------------------------------------- | ------------- | ------------- | ------------------------------------------ |
| R3.2 — Card v2           | [#89](https://github.com/samuel3ssilva/vipreco/pull/89) | `6adcaf7`     | **`4222332`** | `FOUNDER VISUAL GATE — R3.2 APPROVED`      |
| B2B-0 — `/para-mercados` | [#93](https://github.com/samuel3ssilva/vipreco/pull/93) | `053eab9`     | **`dd350b7`** | `FOUNDER B2B VISUAL GATE — B2B-0 APPROVED` |

**O que R3.2 cobre:** Card v2, anatomia, variantes, estados, procedência, responsividade,
acessibilidade, laboratório e evidências. **Não cobre** Home, busca, comparação, detalhe
completo, WhatsApp, dados reais nem ranking patrocinado.

**O que B2B-0 cobre:** `MarketShell`, copy, estrutura, CTA, mobile, desktop, acessibilidade,
neutralidade e a separação entre B2B e B2C. **Não cobre** painel do lojista, login, ERP, upload,
analytics B2B completo, pagamento, contrato, patrocínio nem parceria real.

**B2B-0 concluída não é B2B-1 concluída.** A página existe; nenhuma entrevista aconteceu. O
campo é gate do Founder, e continua fechado.

- **Próxima frente B2C:** R3.3 — Home / Achados.
- **Próxima frente B2B:** B2B-1, conduzida pelo Founder.

---

### DL-035 — Indexabilidade fechada por omissão

- **Data:** 06/08/2026
- **Decisão do:** CTO, sob mandato do Founder/PMO ("impedir que ambientes fora de production
  sejam indexados", "não aplicar bloqueio automaticamente em production")
- **PR:** `fix/staging-noindex`

**A regra virou de lado.** A pergunta era _"este host é técnico?"_ — `*.workers.dev` levava
`noindex`, e qualquer outro host era tratado como público. Aberto por omissão: um domínio novo
viraria indexável sem que ninguém tivesse decidido nada. A pergunta agora é _"este host foi
**declarado** como o host público?"_, e a resposta padrão é não.

Staging **declara** `VITE_PUBLIC_SITE_URL` — precisa declarar, é de onde saem as URLs absolutas
de `og:image` — e mesmo assim continua bloqueado, porque a origem declarada dele termina em
`.workers.dev`. A configuração não consegue errar para o lado perigoso.

**Quatro camadas, quatro falhas diferentes:**

| Camada                       | Cobre                                                                |
| ---------------------------- | -------------------------------------------------------------------- |
| `X-Robots-Tag`               | toda resposta do Worker, decidida pelo host da requisição            |
| `<meta name="robots">`       | o HTML lido sem os headers — salvo em disco, servido por outro proxy |
| `robots.txt` → `Disallow: /` | a **chegada** do rastreador, inclusive aos assets estáticos          |
| `sitemap.xml` → `404`        | o convite explícito para rastrear                                    |

**`robots.txt` saiu de `public/` e virou rota.** Como arquivo estático ele era servido pelo
binding `ASSETS`, que não passa pelo Worker: mesmo conteúdo em todo ambiente e, medido em staging,
a **única** rota que voltava sem `X-Robots-Tag`.

**A tensão entre camadas é deliberada.** Quem obedece ao `Disallow` não busca a página e portanto
não lê o `noindex` do header. Para uma demonstração privada de entrevista, impedir a chegada vale
mais do que impedir a listagem — e o header continua lá para o rastreador que ignore o `Disallow`.

**O que produção vai exigir:** `VITE_PUBLIC_SITE_URL=https://<domínio>` no Environment de
produção. Sem isso, produção nasce bloqueada. O comportamento está testado; **nenhum deploy de
produção foi executado**.

**Residual registrado:** assets estáticos (`/og/*`, `/logo/*`, `/favicon.ico`, `/assets/*`) não
recebem `X-Robots-Tag`, porque `_headers` é estático e não pode variar por ambiente sem também
bloquear a produção futura. Mitigado pelo `Disallow: /`. Ver
`docs/security/EDGE-SECURITY-POLICY.md` § "Riscos residuais conhecidos", item 3.

---

### DL-036 — R3.3A: a Home entrega antes de pedir

- **Data:** 06/08/2026
- **Decisão do:** Founder/PMO, após revisar `home-achados-390.png`,
  `home-achados-states.png` e `home-achados-comparison-board.png`
- **Veredito do Gate:** `R3.3 VISUAL REMEDIATION REQUIRED — MINOR`
- **PR:** #97 (`feat/r3.3-home-achados`), **sem merge**

**O que foi aprovado e não muda:** direção visual, navegação de duas abas, busca na primeira
dobra, Card v2, procedência e os sete estados. A Home **não** foi redesenhada.

**Cinco ajustes, e o fio que os liga: a Home pedia antes de entregar.**

**1. O CTA fixo de WhatsApp saiu.** Ele acompanhava a rolagem desde a primeira dobra — opt-in
oferecido a quem ainda não tinha visto um Achado. Ficou **um** convite, inline, depois dos
Achados: "Receber Achados de Artemis no WhatsApp", com "Só achados de Artemis. Você pode sair
quando quiser.". `StickyWhatsAppCta` foi removido do repositório, e com ele a máquina de
anti-duplicação da Home (`consumerCtaStore`, `WHATSAPP_CTA_MARKER`, o `inert` condicional). **O
conserto de uma duplicação some junto com a duplicação** — o mecanismo continua inteiro em
`/para-mercados`, onde o CTA fixo continua existindo e o problema é real.

**2. O seletor de mercado habitual saiu da Home.** Personalização não é escopo do MVP. Ele
**não** foi apagado do produto: continua em `/produto/$productId`, na variante compacta, onde a
preferência tem consequência imediata. A ideia está registrada como POST-MVP em
`ROADMAP-MVP-v3.md` §4. `home-markets.ts` ficou estacionado, com nota no cabeçalho — adiado não
é rejeitado, e reescrever o tratamento de falha depois seria jogar trabalho fora.

**3 e 4. Os dois blocos longos do rodapé viraram compactos.** "Nenhum preço aparece sozinho"
(quatro cartões + três regras) virou "Preço com procedência" — uma frase e uma porta. "Começou em
Artemis" virou "Feito para começar por Artemis", com a expectativa dita: poucos mercados, poucos
produtos, ampliação depois.

**A redução só foi possível porque o conteúdo mudou de lugar, não de existência.** As três regras
— você compra na loja, o estoque é do mercado, **a ordem não é vendida** — foram para
`/como-funciona`. A terceira é o princípio 4 de neutralidade declarado em público; ela não pode
sumir do site, e um teste em `index.ssr.test.ts` amarra as duas pontas para que a redução não
vire remoção silenciosa numa próxima rodada.

**5. "Sem ofertas vigentes" ganhou copy própria.** Era a divergência que o próprio painel de
estados de R3.3 registrou: os dois estados caíam em _"Estamos começando a mapear preços na sua
região."_ — verdadeiro quando nada foi conferido, **falso** quando houve mapeamento e o preço
envelheceu. Agora são duas telas, e a distinção é **dado, não heurística**: lista de origem vazia
é vazio real; lista com itens e nenhum válido é oferta vencida (`src/lib/home-states.ts`). Só a
segunda oferece "Buscar produto" — no vazio real não há o que buscar, e o botão levaria a uma
segunda tela vazia.

**As copies moram num módulo só** porque a Home e o laboratório de estados mostram a mesma
mensagem por definição: uma evidência de Gate que exibe copy que o produto não tem é pior do que
evidência nenhuma. O teste exigido pelo mandato verifica a **propriedade** — nenhum campo visível
coincide entre as duas telas —, não as frases de hoje.

**Escopo:** o guarda de `index.escopo.test.ts` reprovou cada arquivo novo antes de ele entrar no
allowlist, que é a ordem certa. Banco, migrations, ranking, comparação, detalhe, `/para-mercados`,
Worker e produção não foram tocados.

### DL-037 — R3.3B: a Home volta a ter produto

- **Data:** 07/08/2026
- **Decisão do:** Founder/PMO, após revisar o checkpoint de R3.3A
- **Veredito do Gate:** aprovado nos contratos, **reprovado na direção visual**
- **PR:** #97 (`feat/r33-home-achados`), **sem merge**

O Founder foi explícito sobre o diagnóstico e sobre a prioridade: _"Tecnicamente, a R3.3A está
boa… PORÉM O FOUNDER NÃO APROVA A DIREÇÃO VISUAL ATUAL."_ e _"NÃO FAZER MAIS BACKEND NESTA
MISSÃO. CONCENTRAR O ESFORÇO EM DESIGN, UX E POLIMENTO VISUAL."_ O MVP vai ser mostrado a
consumidores de Artemis e a donos de supermercado, e para essas conversas parecer produto vale
mais do que somar capacidade.

**O fio de tudo: a Home não tinha produto.** Todo Achado era um retângulo cinza com uma silhueta
de ícone, e o resto da tela era texto — datas em monoespaçada, um selo tracejado de fixture, dois
parágrafos explicando o campo de busca. Nada disso estava errado; tudo somado dava um painel
administrativo.

**1. Ilustrações genéricas de categoria (§5).** Três SVGs planos em `public/img/demo/`, sem
texto, sem embalagem, marca, logotipo ou trade dress de terceiro. O contrato do Card v2 ganhou a
bandeira `ilustrativa`, e o teste `demo-opportunities.ilustrativas.test.ts` reprova qualquer
oferta que a carregue sem `is_demo` — a proibição do mandato ("não tratar imagem ilustrativa como
correspondência real de SKU") virou portão, não prosa.

**As marcas do fixture passaram a ser fictícias**, e isso não é escopo extra: um desenho genérico
ao lado do nome de uma marca existente representa a embalagem daquela marca, por mais genérico
que seja o traço. O assessment da North Star V2 já tinha rejeitado marcas reais nas telas; esta
rodada fechou a ponta do dado. As substitutas vêm da própria North Star V2.

**Divergência registrada e não corrigida:** `supabase/seed.sql` segue com as marcas antigas, e em
staging a Home mostrará "Serra Alta" enquanto a página do produto — que lê do banco — mostra a
anterior. Alinhar exige reseed, que é banco, e §10 manda documentar em vez de implementar.

**2. Uma anatomia, duas composições (§6).** A lista deixou de ser o `AchadoCard` e passou a ser
`card-v2/compact.tsx`, que chama a **mesma** `montarVisaoDoCard` do destaque. Duas anatomias eram
duas chances de uma regra ser cumprida de um lado e esquecida do outro — foi assim que o histórico
de preço sobreviveu na Home por uma onda inteira depois de sair do Card v2 (DL-030). O
`AchadoCard` deixou de existir; a densidade que R3.3 mediu foi preservada pela composição, não
por um segundo componente.

**3. A ênfase entre os dois CTAs se inverteu (§6).** O botão sólido da Home passou a ser o de
comparação, que é o núcleo do produto; o convite de WhatsApp ficou contornado. A página pedia
contato com mais força do que oferecia comparação.

**4. A primeira dobra encolheu (§6, §7).** Título de sete palavras para três — "Achados em
Artemis", que diz **menos**, não mais —, campo de busca de 56 px, atalhos em pílula, e o aviso de
confiança discreto em vez de caixa de alerta. O cabeçalho de seção da busca saiu: duas frases
explicando um campo com lupa, `placeholder` e quatro atalhos com nome de produto. Rótulo e
instrução continuam no HTML, em `sr-only` — escondido visualmente não é ausente.

**5. Saiu o que parecia laboratório (§7).** A moldura tracejada em monoespaçada do selo de dados
fictícios — **a frase ficou** —, e o `font-data` das linhas de procedência. A regra é do próprio
design system: mono só em dado tabular de fato, e "observado em 06/08/2026 · ontem" é texto
corrido.

**6. Hierarquia (§8).** Preço do destaque de 2 rem para 2,625 rem, imagem de 96 px para 112, e a
condição de promoção como nota em vez de caixa contornada. A ordem pedida — produto, preço,
mercado, confiança, ação — passou a ter pesos distintos em vez de seis linhas equidistantes.

**7. Os sete estados (§9)** continuam sendo contrato, um a um. O que mudou foi a apresentação:
ícone em círculo, título na tipografia de display, espaço para respirar.

**Medido, não afirmado:** cinco larguras sem rolagem horizontal, duas abas em todas, zero
controles abaixo de 48 px, zero histórico de preço, exatamente um CTA de WhatsApp, e a página
~19% mais curta a 390 px. O guarda de escopo reprovou os treze caminhos novos antes de cada um
entrar no allowlist com o seu motivo escrito.

**Não tocado:** banco, migrations, backfill, dados reais, produção, DNS, Worker, RLS, ranking,
comparação, detalhe da oferta, busca e `/para-mercados`.

---

## DL-038 — R3.3C: a convergência visual final da Home (07/08/2026)

**Contexto.** O Founder aprovou o diagnóstico de R3.3B ("a Home não tinha produto") e ainda assim
segurou o merge do PR #97 por uma última rodada: _"A R3.3B melhorou significativamente… PORÉM o
Founder quer uma última convergência visual antes do merge."_ A pergunta da missão foi escrita
assim: _"Conseguimos fazer a Home real parecer tão desejável quanto a referência visual, sem
mentir, inventar cobertura ou aumentar o escopo?"_ Nenhuma linha de backend foi tocada.

**1. As três ilustrações foram REDESENHADAS (§1, §11).** As de R3.3B eram corretas na política e
fracas no reconhecimento: a 64 px — o tamanho em que aparecem na lista — o arroz lia como um pote
com uma faixa escura. Agora o arroz é o fardo com **janela transparente e grãos à vista**, que é o
que nomeia a categoria; o café ganhou a solda superior mais larga que o corpo (sem ela lia como
tampa de pote) e os **grãos soltos fora do contorno**; o leite virou a caixa longa com tampa de
rosca, que é a silhueta do leite que se vende em Artemis. A política não mudou em nada: sem
embalagem, marca, logotipo ou trade dress de terceiro, sem `<text>` no arquivo, sem recurso
externo, e presas por teste a dado `is_demo` nas três entidades.

**2. O preço subiu para a coluna da identidade (§14).** É a mudança estrutural da rodada, e ela
vem da própria referência aprovada: a tela 1 da North Star V2 empilha nome, marca, variante,
quantidade e preço numa coluna só, ao lado da imagem. O card entregue em R3.3B era duas faixas
— `[imagem | identidade]` em cima, tudo o mais em largura inteira embaixo — e sobrava um retângulo
vazio à direita da imagem e outro à direita do preço. **Esse vazio, mais do que qualquer cor ou
tipografia, era o que fazia a composição parecer registro em vez de produto.** A ordem do §5 e a
ordem do DOM não mudaram; há teste novo que reprova o preço subir acima do nome.

**Consequência medida:** imagem e preço passaram a dividir a mesma largura, então os dois
escalonam **por faixa** — 96 px/2,25 rem a 320, até 128 px/3 rem a partir de `sm`. O teto de cada
faixa é o que a coluna comporta, não o gosto.

**3. Copy do §4 e do §7.** O subtexto passou de "nos mercados do bairro" para **"nos mercados
monitorados, com data e fonte"**: "do bairro" afirma COBERTURA, e o piloto não pode sustentar
"todos os mercados daqui". O bloco de procedência perdeu a segunda frase — o que ela dizia é o
assunto de `/como-funciona`, para onde o botão logo abaixo leva.

**4. Saiu o que parecia formulário (§14).** O botão de compartilhar deixou de ocupar a largura
inteira colada sob o CTA verde, e o selo de fonte deixou de esticar de ponta a ponta do card (um
`items-start` que faltava, o mesmo defeito que `OfferStatus` já tinha corrigido). **A borda do
botão de compartilhar ficou:** ela é a correção de contraste de elemento não textual (SC 1.4.11)
feita na Parte 2, e trocar acessibilidade por estética é a única troca que esta missão não podia
fazer.

**5. Dois testes de literal viraram testes de relação (§19: "não criar testes frágeis de pixel").**
As asserções de hierarquia de preço fixavam `text-[2.625rem]` e `text-[1.375rem]`. Elas pegavam a
regressão que importa — os três preços empatarem —, mas reprovavam também quando alguém só mudava
o tamanho do destaque, que é decisão de desenho. Passaram a medir o que o produto garante: **um
preço de destaque, maior que os dois da lista, e os dois da lista iguais entre si.**

**6. §13 — a direção B2B foi registrada, e `/para-mercados` não foi tocada.**
`docs/product/B2B-VISUAL-DIRECTION.md` guarda a referência como _future polish reference_, com a
lista de promessas que precisam sair antes de qualquer implementação: "milhares de moradores",
"mais clientes", "mais visibilidade" garantida, "destaque nas buscas" — esta última não é feature
adiada, é feature **vetada** pelo princípio 4 de neutralidade —, "seguro" como promessa ampla,
"parceiro oficial" e o cadastro de oferta pelo lojista, que não existe.

**NOT VERIFIED — as duas referências visuais anexadas não chegaram.** O mandato citou dois anexos
("A. ViPreço MVP — visão final do cliente" e "B. /para-mercados — versão final"); **a mensagem
recebida continha apenas texto.** A convergência foi feita contra a descrição escrita do mandato e
contra a referência **versionada** que já existe no repositório
(`docs/product/visual-north-star-v2/telas/tela-1-home.png`), que é a coluna B do painel. Se as
duas imagens forem versionadas depois, esta decisão deve ser reconfrontada com elas.

**Medido, não afirmado:** cinco larguras sem rolagem horizontal, duas abas em todas, zero
controles abaixo de 48 px, zero histórico de preço, exatamente um CTA de WhatsApp, e a página a
390 px em **4356 px** — 5568 px em R3.3A, cerca de **22% mais curta**. O guarda de escopo reprovou
`ShareAchadoButton.tsx` **antes** de a entrada existir no allowlist, que é a ordem certa.

**Divergência que continua aberta:** `supabase/seed.sql` segue com as marcas antigas (DL-037).
Alinhar exige reseed, que é banco, e banco continua fora do escopo (§18).

**Não tocado:** banco, migrations, backfill, dados reais, produção, DNS, Worker, RLS, ranking,
comparação, detalhe da oferta, busca, analytics e `/para-mercados`.
