# ViPreço

MVP mobile-first para comparar preços de supermercados da sua região.
Consumidores usam o app **sem login**; o conteúdo é público e somente leitura,
e as contribuições da comunidade entram como sugestões pendentes de revisão.

## Stack

- React 19 + TypeScript + Vite (TanStack Start / TanStack Router)
- Tailwind CSS v4 (design system em `src/styles.css`, tokens oklch verde/azul-petróleo)
- TanStack Query para carregamento de dados
- React Hook Form + Zod para formulários e validação
- Supabase (projeto próprio, Postgres + Data API) como backend
- Vitest para testes das regras de negócio

## Rotas

| Rota                  | Descrição                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `/`                   | Oportunidades da semana, produtos atualizados e mercado habitual |
| `/buscar`             | Busca por nome, marca, variante, tamanho ou código de barras     |
| `/produto/$productId` | Comparação de preços do mesmo produto entre mercados             |
| `/como-funciona`      | Origem dos dados, revisão e limites do sistema                   |
| `/sitemap.xml`        | Sitemap gerado no servidor                                       |

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
- Inserções públicas são permitidas apenas em sugestões, interesses e feedback,
  sempre com status `pending` e sem dados pessoais.
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
- **Ambiente:** hoje existe um único ambiente (Worker + projeto Supabase), usado tanto
  para teste quanto para o que futuramente será produção — tratado internamente como
  "staging legado" até que a separação staging/produção seja feita (ver `PLANO.md` §8).
- **Lovable:** o projeto foi criado e hospedado originalmente pela Lovable; a decisão de
  sair completamente já foi tomada, mas a desconexão no painel da Lovable **ainda não
  foi confirmada** — não presuma que o Git sync está desligado.

## Acessibilidade

Alvos de toque com no mínimo 44 px, foco visível, rótulos associados,
mensagens de erro com `role="alert"`, estados de carregamento com `aria-live`
e linguagem simples em português do Brasil.
