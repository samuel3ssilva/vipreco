# CLAUDE.md — ViPreço

Comparador mobile-first de preços de supermercado. Piloto em Artemis
(bairro de Piracicaba-SP). O comparador gratuito e **neutro** é o núcleo do
produto — nenhuma mudança pode comprometê-lo.

- **Escopo de produto (fonte oficial desde 02/08/2026):** `docs/product/ROADMAP-MVP-v3.md`,
  com as specs de `docs/product/` e `docs/data/` e as decisões em
  `docs/pmo/MVP-DECISION-LOG.md`
- **Governança, gates, tese, neutralidade e ações proibidas:** `PLANO-MESTRE.md`
  (§12.4, §12.5 e §13 estão superseded **apenas** no escopo de produto)
- **Índice da documentação — o que é normativo, descritivo e histórico:** `docs/INDEX.md`
- **Histórico da tese de produto original e das Ondas de fundação:** `PLANO.md`
  (subordinado ao `PLANO-MESTRE.md` em caso de conflito)
- **Este arquivo:** como trabalhar neste código. Não presuma nada diferente do
  que está escrito aqui — inspecione o código antes de alterar.

## Definição do produto

> O ViPreço ajuda o usuário a encontrar, reconhecer e comparar o mesmo produto entre
> diferentes mercados, com preço, mercado, fonte, data e validade.

A **comparação é o núcleo**. Achados e WhatsApp são aquisição, descoberta e retenção.

## Stack real

- React 19 + TypeScript estrito + **TanStack Start / TanStack Router** (rotas em `src/routes/`)
- Tailwind CSS **v4** — design tokens em `src/styles.css`; componentes shadcn/Radix em `src/components/ui/`
- TanStack Query para dados; React Hook Form + Zod para formulários
- Backend: Supabase (projeto próprio, Postgres + Data API) via `@supabase/supabase-js`
- Testes: Vitest; Lint: ESLint + Prettier
- Build/deploy: Vite + Nitro, alvo Cloudflare, via `wrangler`
- `origin/main` de `github.com/samuel3ssilva/vipreco` é a fonte da verdade do código;
  todo trabalho passa por branch, PR e CI (`.github/workflows/ci.yml`) antes de chegar em `main`

## Comandos

```bash
bun install
bun run dev
bun run format
bun run lint
bun run test
bun run build
```

Validação obrigatória antes de concluir qualquer tarefa (saída zero nos três):

```bash
bun run lint && bun run test && bun run build
```

## Mapa do código

| Onde                           | O quê                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/lib/comparison.ts`        | Regras de domínio de preços (funções puras, testadas em `comparison.test.ts`)                            |
| `src/lib/normalize.ts`         | Normalização de busca — contrato único com `pa_normalize_text()` no banco                                |
| `src/lib/temporal.ts`          | Estado temporal do card; nunca inventa validade nem cria urgência                                        |
| `src/lib/indexing.ts`          | Quem pode ser indexado, `robots.txt`, `sitemap.xml`, canônico — por host e por build                     |
| `src/lib/app-mode.ts`          | A chave única entre demonstração e piloto                                                                |
| `src/services/catalog.ts`      | Único ponto de acesso a dados — componentes não fazem query direta                                       |
| `src/integrations/supabase/`   | Cliente e tipos                                                                                          |
| `src/lib/local-preferences.ts` | Mercado habitual e afins — somente `localStorage`, sem login                                             |
| `src/routes/`                  | `/`, `/buscar`, `/produto/$productId`, `/como-funciona`, `/para-mercados`, `/robots.txt`, `/sitemap.xml` |
| `src/components/`              | `AchadoCard`, `PriceCard`, `PriceSummary`, `SourceBadge`, `StickyCta`, `UsualMarketPicker`…              |
| `supabase/migrations/`         | Migrations versionadas — nunca editar migration aplicada; criar corretiva                                |
| `supabase/seed.sql`            | Dados fictícios com `is_demo = true`; nunca nomes reais de mercados                                      |

## Modelo de dados (nomes reais)

- **`markets`** — mercados: `name`, `neighborhood`, `address`, `maps_url`, `is_active`, `is_demo`
- **`products`** — SKU exato: `name`, `brand`, `variant`, `size_text`, `gtin`,
  `category`, `search_text` (normalizado por trigger), `is_active`, `is_demo`.
  `size_text` é **texto livre** e não serve como fonte de cálculo — a quantidade
  estruturada é alvo de E1 (`docs/data/MVP-DATA-CONTRACT.md`), ainda não implementada
- **`prices`** — `price > 0` (numeric), `source_type` ∈ {`receipt`, `store_list`,
  `weekly_audit`, `shelf_photo`, `community`, `social_media`}, `observed_at`,
  `valid_until`, `special_condition`, `is_featured`, `is_active`, `is_demo`
- **`price_submissions`** — sugestões da comunidade, sempre criadas como `pending`
- **`product_watch_requests`**, **`decision_feedback`** — instrumentação anônima do piloto

## Princípios invioláveis

1. **Identidade exata de produto.** O registro comparável é um **SKU exato**, e a
   comparação usa um único `product_id`. GTIN é texto (preservar zeros) e **não é a
   chave de produto**. Nunca misturar tamanhos, variantes, embalagens ou marcas:
   250 g ≠ 500 g, 900 ml ≠ 1 L, tradicional ≠ descafeinado, vidro ≠ sachê. Busca
   aproximada sugere candidatos; não autoriza juntar produtos diferentes. **Similar
   nunca entra na comparação exata, em nenhuma fase**; outro tamanho vive em seção
   própria e só se compara por preço unitário. Ver `docs/product/CANONICAL-PRODUCT-SPEC.md`.
2. **Preço válido** = `is_active AND observed_at <= now() AND (valid_until IS NULL
OR valid_until >= now())`. Implementado em `isValidPrice()` **e** na policy RLS
   de `prices` — manter os dois em sincronia sempre.
3. **Um preço por mercado, ordenado por preço.** Exibir apenas o preço válido mais
   recente de cada mercado. Ordem: **preço crescente → observação mais recente →
   `id`**. O terceiro critério não é opcional: sem ele a mesma consulta produz
   listas diferentes.
4. **Neutralidade do ranking.** Conteúdo destacado ou pago (`is_featured`, futura
   camada de parceiros) vive em seção separada e rotulada. **Jamais** reordena a
   lista orgânica da comparação. Promoção estruturada também não: a ordem é pelo
   preço de prateleira, nunca pelo preço efetivo.
5. **RLS em toda tabela pública.** Anônimo **só lê**, e só registros ativos/válidos.
   Não existe superfície pública de escrita: o INSERT das três tabelas de submissão
   foi revogado na Onda 3 e os controles não são renderizados. `service_role` jamais
   no frontend, em variável `VITE_*`, em log ou em commit.
6. **Sem segredos no Git.** Frontend usa apenas URL pública + publishable key.
   `.env` fora do versionamento; manter `.env.example` sem valores reais.
7. **Comunidade não escreve em `prices`.** Sugestões viram preço apenas pelo
   fluxo de moderação server-side (`approve_submission`).
8. **Sem atalhos que escondem erro.** Proibidos: `any`, `@ts-ignore`,
   enfraquecer asserts, `eslint-disable` amplo, `--no-verify`, mocks permanentes.
9. **Escopo é lei.** Nada de login de consumidor, pagamentos, geolocalização,
   OCR, notificações ou IA no produto — ver "Fora do MVP" em
   `docs/product/ROADMAP-MVP-v3.md` §4 e a ordem de execução em
   `docs/pmo/MVP-EXECUTION-PLAN.md`.
10. **Mobile-first, pt-BR, acessível.** Funcional a partir de 360 px, áreas de
    toque ≥ 44 px, foco visível, labels associados, erros com `role="alert"`,
    carregamento com `aria-live`, linguagem simples.
11. **Nenhuma imagem aproximada.** Imagem só com revisão aprovada e correspondência
    exata de variante e gramatura. Fora disso, **placeholder** — nunca aproximação.
    Ver `docs/data/IMAGE-POLICY.md`.
12. **Analytics é first-party e sem dado pessoal.** Endpoint próprio no Worker, lista
    fechada de eventos, validação server-side, sem SDK de terceiro, sem cookie, sem
    identificador persistente, sem texto livre no payload. Ver
    `docs/analytics/MVP-EVENT-TAXONOMY.md`.
13. **Uma fonte de dado, um contrato.** Fixture e banco obedecem ao mesmo contrato de
    domínio, trocados por adapter. Nenhum componente consulta dados diretamente.
14. **Nenhuma migration é aplicada sem gate humano.** Escrever é trabalho do CTO;
    aplicar em staging ou em produção é decisão do Founder/PMO, sempre.

## Processo por tarefa

1. Ler a tarefa (`docs/pmo/MVP-EXECUTION-PLAN.md` e o card correspondente em
   `docs/pmo/TRELLO-MAPPING.md`) e o código relacionado.
2. Fazer a **menor** alteração coerente que resolve a tarefa.
3. Criar ou atualizar os testes das regras afetadas.
4. Rodar `bun run lint && bun run test && bun run build` até saída zero.
5. Revisar `git diff` (sem segredos, sem escopo extra).
6. Commit exclusivo e descritivo; marcar a tarefa como `[x]` só após a validação.
7. Avançar para a próxima tarefa aberta da mesma onda. Parar ao fim da onda.

Nunca: marcar tarefa incompleta, declarar comando não executado, remover testes
para ficar verde, ampliar escopo da onda. Bloqueio externo (credencial, acesso):
concluir o que for possível localmente, documentar o bloqueio, não inventar
resultados, não pedir segredos.
