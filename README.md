# ViPreço

MVP mobile-first para comparar preços de supermercados da sua região.
Consumidores usam o app **sem login** e o conteúdo é público e somente leitura.

**Escopo de produto:** [`docs/product/ROADMAP-MVP-v3.md`](docs/product/ROADMAP-MVP-v3.md).
**Índice da documentação, com o que é normativo e o que é histórico:**
[`docs/INDEX.md`](docs/INDEX.md).

## Stack

- React 19 + TypeScript + Vite (TanStack Start / TanStack Router)
- Tailwind CSS v4 (design system em `src/styles.css`, tokens oklch verde/azul-petróleo)
- TanStack Query para carregamento de dados
- React Hook Form + Zod para formulários e validação
- Supabase (projeto próprio, Postgres + Data API) como backend
- Vitest para testes das regras de negócio

## Rotas

| Rota                  | Descrição                                                      |
| --------------------- | -------------------------------------------------------------- |
| `/`                   | Achados, busca, mercado habitual e seções de confiança         |
| `/buscar`             | Busca por nome, marca, variante, tamanho ou código de barras   |
| `/produto/$productId` | Comparação de preços do mesmo produto entre mercados           |
| `/como-funciona`      | Origem dos dados, revisão e limites do sistema                 |
| `/para-mercados`      | Proposta para donos de supermercado, com convite pelo WhatsApp |
| `/sitemap.xml`        | Sitemap gerado no servidor                                     |

## Modelo de dados

- `markets` — supermercados ativos (com sinalização `is_demo`).
- `products` — produtos com `search_text` normalizado (sem acento/caixa) e índice `pg_trgm`.
- `prices` — preços com `source_type`, `observed_at`, `valid_until`, condição especial e destaque.
- `price_submissions` — sugestões da comunidade, sempre criadas como `pending`.
- `product_watch_requests` — interesse anônimo em acompanhar um produto.
- `decision_feedback` — resposta anônima sobre utilidade da comparação.

### Regras de negócio

1. Só entram na comparação preços ativos, já observados e dentro da validade.
2. De cada mercado é exibido apenas o preço válido **mais recente**.
3. A lista é ordenada do menor para o maior preço.
4. Produtos só são comparados quando marca, variante e tamanho coincidem.
5. Toda contribuição da comunidade fica pendente até revisão manual.

Essas regras vivem em `src/lib/comparison.ts` e estão cobertas por testes.

## Segurança

- RLS habilitado em todas as tabelas, com `GRANT` explícito por papel.
- `anon`/`authenticated` só leem registros ativos e válidos.
- **Não existe nenhuma superfície pública de escrita.** O INSERT de
  `price_submissions`, `product_watch_requests` e `decision_feedback` foi revogado
  de `anon`/`authenticated` na Onda 3 (checkpoint PMO de 29/07/2026,
  `supabase/migrations/20260729223000_close_public_write_surfaces.sql`), e os três
  controles correspondentes não são renderizados. Reabrir qualquer um exige endpoint
  server-side, validação, proteção anti-abuso, teste de bypass e novo gate.
- Preferências (mercado habitual, interesses respondidos) ficam apenas no
  `localStorage` do aparelho.

## Dados fictícios

`supabase/seed.sql` cria 4 mercados, 7 produtos (incluindo tamanhos diferentes
do mesmo item) e 22 preços com fontes e validades variadas. Registros de
demonstração possuem `is_demo = true` e a interface exibe o aviso
"Ambiente de teste com preços fictícios".

## Comandos

```bash
bun install     # dependências
bun run dev     # ambiente local
bun run test    # testes (Vitest)
bun run build   # build de produção
```

## Infraestrutura

- **Código:** `origin/main` de [github.com/samuel3ssilva/vipreco](https://github.com/samuel3ssilva/vipreco)
  é a fonte da verdade. CI (`.github/workflows/ci.yml`) roda instalação com lockfile
  congelado, lint, testes e build a cada push/PR.
- **Deploy:** direto na Cloudflare via `wrangler` (Nitro, preset `cloudflare-module`);
  não depende mais de um pipeline gerenciado pela Lovable.
- **Ambiente:** staging e produção são ambientes totalmente separados — Workers e projetos
  Supabase próprios, credenciais próprias via GitHub Environments (Onda 2 concluída, ver
  `PLANO-MESTRE.md` §1 e §12.1). Produção roda hoje apenas em `workers.dev`, sem DNS
  próprio e sem dados reais; `vipreco.com.br` permanece sem apontamento até novo gate.
- **Lovable:** o projeto foi criado e hospedado originalmente pela Lovable. O código,
  o banco de dados e o deploy não dependem mais dela — a GitHub App da Lovable foi
  removida (instalação desinstalada, autorização revogada, projeto desconectado) e o
  fluxo de trabalho é 100% branch → PR → CI → merge neste repositório.

## Acessibilidade

Alvos de toque com no mínimo 44 px, foco visível, rótulos associados,
mensagens de erro com `role="alert"`, estados de carregamento com `aria-live`
e linguagem simples em português do Brasil.
