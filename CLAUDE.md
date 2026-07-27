# CLAUDE.md — Preço Artemis

Comparador mobile-first de preços de supermercado. Piloto em Artemis
(bairro de Piracicaba-SP). O comparador gratuito e **neutro** é o núcleo do
produto — nenhuma mudança pode comprometê-lo.

- **O quê / por quê / escopo por onda:** `PLANO.md`
- **Este arquivo:** como trabalhar neste código. Não presuma nada diferente do
  que está escrito aqui — inspecione o código antes de alterar.

## Stack real

- React 19 + TypeScript estrito + **TanStack Start / TanStack Router** (rotas em `src/routes/`)
- Tailwind CSS **v4** — design tokens em `src/styles.css`; componentes shadcn/Radix em `src/components/ui/`
- TanStack Query para dados; React Hook Form + Zod para formulários
- Backend: Lovable Cloud (Postgres + Data API compatível com Supabase) via `@supabase/supabase-js`
- Testes: Vitest; Lint: ESLint + Prettier
- Build/deploy: Vite + Nitro, alvo Cloudflare
- Projeto conectado ao Lovable — **nunca reescreva histórico já publicado** (ver `AGENTS.md`)

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

| Onde | O quê |
| --- | --- |
| `src/lib/comparison.ts` | Regras de domínio de preços (funções puras, testadas em `comparison.test.ts`) |
| `src/lib/normalize.ts` | Normalização de busca (acentos, caixa, GTIN) |
| `src/services/catalog.ts` | Único ponto de acesso a dados — componentes não fazem query direta |
| `src/integrations/supabase/` | Cliente e tipos |
| `src/lib/local-preferences.ts` | Mercado habitual e afins — somente `localStorage`, sem login |
| `src/routes/` | `/`, `/buscar`, `/produto/$productId`, `/como-funciona`, `/sitemap.xml` |
| `src/components/` | `PriceCard`, `PriceSummary`, `SourceBadge`, `SubmitPriceForm`, `UsualMarketPicker`… |
| `supabase/migrations/` | Migrations versionadas — nunca editar migration aplicada; criar corretiva |
| `supabase/seed.sql` | Dados fictícios com `is_demo = true`; nunca nomes reais de mercados |

## Modelo de dados (nomes reais)

- **`markets`** — mercados: `name`, `neighborhood`, `address`, `maps_url`, `is_active`, `is_demo`
- **`products`** — produto canônico: `name`, `brand`, `variant`, `size_text`, `gtin`,
  `category`, `search_text` (normalizado por trigger), `is_active`, `is_demo`
- **`prices`** — `price > 0` (numeric), `source_type` ∈ {`receipt`, `store_list`,
  `weekly_audit`, `shelf_photo`, `community`, `social_media`}, `observed_at`,
  `valid_until`, `special_condition`, `is_featured`, `is_active`, `is_demo`
- **`price_submissions`** — sugestões da comunidade, sempre criadas como `pending`
- **`product_watch_requests`**, **`decision_feedback`** — instrumentação anônima do piloto

## Princípios invioláveis

1. **Identidade exata de produto.** A comparação usa um único `product_id`.
   GTIN é texto (preservar zeros). Nunca misturar tamanhos, variantes ou marcas:
   250 g ≠ 500 g, 900 ml ≠ 1 L, tradicional ≠ descafeinado. Busca aproximada
   sugere candidatos; não autoriza juntar produtos diferentes.
2. **Preço válido** = `is_active AND observed_at <= now() AND (valid_until IS NULL
   OR valid_until >= now())`. Implementado em `isValidPrice()` **e** na policy RLS
   de `prices` — manter os dois em sincronia sempre.
3. **Um preço por mercado, ordenado por preço.** Exibir apenas o preço válido mais
   recente de cada mercado, ordenar por preço crescente, desempate determinístico.
4. **Neutralidade do ranking.** Conteúdo destacado ou pago (`is_featured`, futura
   camada de parceiros) vive em seção separada e rotulada. **Jamais** reordena a
   lista orgânica da comparação.
5. **RLS em toda tabela pública.** Anônimo só lê registros ativos/válidos e só
   insere `pending`. `service_role` jamais no frontend, em variável `VITE_*`,
   em log ou em commit.
6. **Sem segredos no Git.** Frontend usa apenas URL pública + publishable key.
   `.env` fora do versionamento; manter `.env.example` sem valores reais.
7. **Comunidade não escreve em `prices`.** Sugestões viram preço apenas pelo
   fluxo de moderação server-side (`approve_submission`).
8. **Sem atalhos que escondem erro.** Proibidos: `any`, `@ts-ignore`,
   enfraquecer asserts, `eslint-disable` amplo, `--no-verify`, mocks permanentes.
9. **Escopo é lei.** Nada de login de consumidor, pagamentos, geolocalização,
   OCR, notificações ou IA no produto — ver "Fora de escopo" e as ondas no `PLANO.md`.
10. **Mobile-first, pt-BR, acessível.** Funcional a partir de 360 px, áreas de
    toque ≥ 44 px, foco visível, labels associados, erros com `role="alert"`,
    carregamento com `aria-live`, linguagem simples.

## Processo por tarefa

1. Ler a tarefa (checklist da onda ativa no `PLANO.md`) e o código relacionado.
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
