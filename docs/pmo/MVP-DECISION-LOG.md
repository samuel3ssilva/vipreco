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

---

### DL-021 — Contagem real do quadro Trello, medida e discriminada

- **Decisão:** a contagem de cards do quadro passa a ser registrada **discriminada por
  categoria**, e não como um número único de “UNMAPPED”. A medição de 04/08/2026 substitui
  o número de 19 registrado em DL-019.
- **Medição (04/08/2026, quadro `ViPreço - MVP Artemis`):**

  | Categoria | Quantidade |
  | --- | --- |
  | cards oficiais com ID `MVP-…` / `POST-MVP-…` | 42 |
  | cards oficiais da trilha pós-MVP, com ID `PM-DATA-…` | 14 |
  | **subtotal oficial** (bate com os 56 de DL-019) | **56** |
  | cards operacionais de onda, `R0`–`R8`, criados manualmente | 9 |
  | cards do próprio Trello (lista “Guia de introdução ao Trello”) | 7 |
  | outros cards manuais (2 em `Ideias`, 1 em `Precisa validar`, 1 em `Concluído`) | 4 |
  | **subtotal não oficial** | **20** |
  | **total aberto** | **76** |
  | arquivados | 1 |
  | **total geral** | **77** |

- **Por que 19 estava errado:** o número tratava como uma categoria só o que são três — os
  cards de onda `R0`–`R8` (trabalho do Founder), os cards que o próprio Trello cria ao abrir
  um quadro, e os cards manuais avulsos. Um número agregado não permite responder a pergunta
  que interessa: *o que aqui é trabalho e o que é ruído de ferramenta?*
- **Por que os 14 `PM-DATA-…` contam como oficiais:** eles têm ID e estão no mapeamento; o
  prefixo é diferente porque a trilha é pós-MVP. `42 + 14 = 56` fecha exatamente com o total
  oficial de DL-019, o que confirma que a divergência estava só na classificação do resto.
- **Estado do card “Teste 1”:** **arquivado**, na lista `Ideias`. É o único card arquivado do
  quadro. Arquivar é reversível; não foi apagado, pela mesma razão de DL-019.
- **Consequência:** nenhum card foi criado, apagado ou reclassificado para chegar a estes
  números — eles são o que o quadro tem. Nenhum `POST-MVP` ou não oficial foi alterado nesta
  missão.
- **Documentos:** `TRELLO-MAPPING.md`, `trello/README.md`
- **Status:** ativa
