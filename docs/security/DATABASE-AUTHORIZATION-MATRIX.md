# Matriz de autorização do banco — Onda 3

Fonte: leitura integral de `supabase/migrations/` (4 arquivos, ordem cronológica confirmada,
cada um tocado por exatamente um commit — sem edição pós-aplicação) e `supabase/seed.sql`.
Estado ao vivo (staging `wjurqpclauwtbjhhvigy`, produção `wpgglxgddnekzojozqlm`) foi validado
estruturalmente no fechamento da Onda 2 (6 tabelas, 6 policies, 6 tabelas com RLS, 4 funções,
`pg_trgm` ativa em ambos) — os detalhes linha-a-linha abaixo vêm do código versionado, que é a
fonte da verdade para o que muda nesta Onda.

"Antes" = estado ao final da Onda 2 (`main` em `559e9f6`). "Depois" = estado ao final desta
Onda, após a migration `20260729210000_harden_helper_function_grants.sql`.

## Tabelas

| Recurso | Role | SELECT | INSERT | UPDATE | DELETE | Policy aplicável | Justificativa | Antes | Depois |
|---|---|:--:|:--:|:--:|:--:|---|---|---|---|
| `markets` | `anon`, `authenticated` | ✅ (`is_active=true`) | ❌ | ❌ | ❌ | `"Mercados ativos sao publicos"` | Catálogo público, editorial (não escrito pela comunidade) | igual | igual |
| `markets` | `service_role` | ✅ | ✅ | ✅ | ✅ | GRANT ALL | CI/migrations/backoffice | igual | igual |
| `products` | `anon`, `authenticated` | ✅ (`is_active=true`) | ❌ | ❌ | ❌ | `"Produtos ativos sao publicos"` | Catálogo público | igual | igual |
| `products` | `service_role` | ✅ | ✅ | ✅ | ✅ | GRANT ALL | CI/migrations/backoffice | igual | igual |
| `prices` | `anon`, `authenticated` | ✅ (ativo + válido + produto/mercado ativos) | ❌ | ❌ | ❌ | `"Precos validos sao publicos"` | Só o preço válido mais recente é público (principle #2 do CLAUDE.md) | igual | igual |
| `prices` | `service_role` | ✅ | ✅ | ✅ | ✅ | GRANT ALL | Única escrita real é via `approve_submission()` (SECURITY DEFINER, ver abaixo) | igual | igual |
| `price_submissions` | `anon`, `authenticated` | ❌ | ✅ (`status='pending'`, produto/mercado ativos, `comment`≤280) | ❌ | ❌ | `"Visitantes podem enviar sugestoes pendentes"` | Comunidade não lê nem escreve em `prices` diretamente (principle #7) | igual | igual |
| `price_submissions` | `service_role` | ✅ | ✅ | ✅ | ✅ | GRANT ALL | Moderação server-side | igual | igual |
| `product_watch_requests` | `anon`, `authenticated` | ❌ | ✅ (produto ativo) | ❌ | ❌ | `"Visitantes podem registrar interesse"` | Instrumentação anônima, write-only | igual | igual |
| `product_watch_requests` | `service_role` | ✅ | ✅ | ✅ | ✅ | GRANT ALL | Backoffice | igual | igual |
| `decision_feedback` | `anon`, `authenticated` | ❌ | ✅ (produto ativo) | ❌ | ❌ | `"Visitantes podem enviar feedback"` | Instrumentação anônima, write-only | igual | igual |
| `decision_feedback` | `service_role` | ✅ | ✅ | ✅ | ✅ | GRANT ALL | Backoffice | igual | igual |

Todas as seis tabelas têm `ENABLE ROW LEVEL SECURITY` — nenhuma tabela exposta pela Data API
está sem RLS. Nenhuma sequence explícita existe (todas as PKs usam `gen_random_uuid()`), então
não há GRANT de sequence a auditar.

## Funções

| Função | SECURITY | `search_path` | EXECUTE (antes) | EXECUTE (depois) | Justificativa |
|---|---|---|---|---|---|
| `pa_normalize_text(text)` | INVOKER (default) | `public` (fixado) | `PUBLIC` (default implícito do Postgres) | apenas `service_role` | Usada só por trigger e índice funcional; nenhum caller externo precisa chamá-la diretamente |
| `pa_set_updated_at()` | INVOKER (default) | `public` (fixado) | `PUBLIC` (default implícito) | apenas `service_role` | Função de trigger, só toca `NEW` |
| `pa_products_search_text()` | INVOKER (default) | `public` (fixado) | `PUBLIC` (default implícito) | apenas `service_role` | Função de trigger, só toca `NEW` |
| `approve_submission(uuid)` | **DEFINER** | `public` (fixado) | `service_role` apenas (`REVOKE ALL FROM PUBLIC` já na Onda 1/2) | igual | Única escrita legítima de `price_submissions` → `prices`; já estava corretamente fechada |

`approve_submission`'s owner efetivo (necessário para avaliar o alcance real do
`SECURITY DEFINER`) **não é verificável a partir do repositório** — `NOT VERIFIED`, requer
`\df+ public.approve_submission` no banco vivo. Risco considerado baixo porque `EXECUTE` já é
restrito a `service_role`, que teria acesso equivalente de qualquer forma via GRANT ALL direto.

## Views, triggers, extensões, Storage, Auth

| Item | Achado |
|---|---|
| Views | Nenhuma view definida |
| Triggers | `markets_updated_at`, `products_search_text`, `prices_updated_at` — todos disparam funções já auditadas acima, sem escrita fora do registro sendo processado |
| Extensões | `pg_trgm`, instalada em schema `extensions` (não polui `public`) |
| Storage | Nenhum bucket ou policy de Storage definido em migration versionada. **NOT VERIFIED** se existe bucket criado fora de versionamento — checagem read-only do painel recomendada no checkpoint |
| Auth | `supabase/config.toml` não tem seção `[auth]` — configuração de signup/redirect/confirmação vive só no painel hospedado, fora de controle de versão. **NOT VERIFIED** — nenhuma interface de login existe no app (confirmado por grep, Fase C), mas o estado exato do Auth do projeto hospedado não é auditável pelo repositório |

## `is_demo` — não é fronteira de RLS

`is_demo` existe em `markets`, `products` e `prices`, mas nenhuma policy de SELECT o referencia.
É um rótulo de proveniência, não um controle de acesso — o isolamento real entre dado fictício e
dado real é inteiramente procedural (só `staging` recebe `supabase/seed.sql`; produção foi
confirmada com 0 linhas nas três tabelas no fechamento da Onda 2). Mudar isso exigiria RLS
adicional condicionada a `is_demo`, uma decisão de produto fora do escopo desta correção pontual
— registrado como risco residual aceito no threat model.

## Mudança aplicada nesta Onda

Migration `supabase/migrations/20260729210000_harden_helper_function_grants.sql`: `REVOKE ALL
... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role` nas três funções auxiliares. Nenhuma
tabela, policy ou RLS foi alterada — a auditoria não encontrou nenhuma policy permissiva demais,
nenhum `GRANT ALL` desnecessário e nenhuma tabela sem RLS. `NOT VERIFIED` contra um Postgres ao
vivo nesta sessão (Docker indisponível no host de desenvolvimento) — revisão feita por leitura de
assinatura/semântica; recomenda-se replay em ambiente descartável antes do gate humano final, ou
aceitar o risco (mudança é um `REVOKE`/`GRANT` puro, sem alteração de schema ou dado).
