# Runbook de resiliência — backup, restore e RPO/RTO

**Onda:** 4 — Resiliência operacional (`PLANO-MESTRE.md` §12.3).
**Natureza:** runbook operacional. Passos marcados **[HUMANO]** dependem de acesso ao
painel do Supabase/Cloudflare ou de decisão do Founder/PMO e não foram executados por
esta Onda — documentados para execução quando autorizado, não simulados.

---

## 1. Inventário de dados a proteger

| Ativo                                                          | Onde vive                                                                                           | Mecanismo de backup hoje                                                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Schema (tabelas, RLS, policies, funções, grants)               | `supabase/migrations/*.sql`, versionado no Git                                                      | Git é o backup — reprodutível do zero, ver §4 (drill automatizado)                                                                 |
| Dados de negócio (`markets`, `products`, `prices`, submissões) | Postgres gerenciado pelo Supabase (staging `wjurqpclauwtbjhhvigy`, produção `wpgglxgddnekzojozqlm`) | Backup automático da plataforma Supabase — mecanismo exato depende do plano contratado, ver §2 (`NOT VERIFIED`)                    |
| Código-fonte e workflows                                       | GitHub `samuel3ssilva/vipreco`                                                                      | Git (histórico completo) + branch protection em `main`                                                                             |
| Configuração de deploy (Worker)                                | `wrangler.json` gerado no build + nome do Worker                                                    | Reconstruído a cada deploy a partir do código versionado — não há estado a "perder" no Worker em si                                |
| Secrets (`CLOUDFLARE_API_TOKEN`, `SUPABASE_*`)                 | GitHub Environment secrets                                                                          | Fora do escopo de backup de dado — rotação/recuperação é procedimento de credencial, não de dado (ver `docs/security/` da Onda 1C) |

Produção está confirmada vazia desde o fechamento da Onda 2/3 (0 linhas em
`markets`/`products`/`prices`) — o risco de perda de dado real hoje é **zero**, mas o
runbook precisa estar pronto **antes** do Gate R0 liberar dado real, que é exatamente a
dependência que `PLANO-MESTRE.md` §10 registra.

## 2. RPO/RTO propostos

**`NOT VERIFIED` — depende do plano Supabase contratado.** `docs/security/THREAT-MODEL-ONDA-3.md`
(item 2 da lista de abusos) registra que o projeto está hoje no **plano Free**. O plano
Free do Supabase historicamente oferece apenas backup diário automático com retenção
curta e **não** inclui Point-in-Time Recovery (PITR); PITR granular (RPO de minutos) é
recurso de planos pagos. Este documento não assume um número de dias de retenção
específico sem confirmação — isso é **[HUMANO]**: confirmar em
`Painel Supabase → Project Settings → Database → Backups` para staging e produção antes
do Gate R0.

Proposta condicionada ao que for confirmado:

| Cenário                        | RPO proposto                           | RTO proposto                                                                  | Depende de                                            |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Plano Free (hoje, presumido)   | Até 24h (janela entre backups diários) | Até 4h (tempo estimado para restaurar um backup + reaplicar deploy do Worker) | Confirmação humana da retenção real no painel         |
| Se migrar para plano com PITR  | Minutos (RPO quase contínuo)           | Até 1h                                                                        | Decisão de custo — fora do escopo autônomo desta Onda |
| Schema (independente do plano) | Zero — está no Git                     | Minutos (`bun run drill:schema-rebuild` prova reconstrução total)             | Nada — já automatizado nesta Onda                     |

Enquanto o piloto não tiver dado real (pré-Gate R0), um RPO de 24h é aceitável — não há
transação financeira nem dado de participante em risco. Esta proposta deve ser
revisitada explicitamente como pré-requisito do Gate R0, quando dado real passar a
existir e o custo de recriar uma remarcação perdida deixar de ser hipotético.

## 3. Procedimento de restore

### 3.1 Automatizado — reconstrução de schema (feito nesta Onda)

```bash
bun run drill:schema-rebuild
```

Sobe um Postgres efêmero (Docker), simula o ponto cego de plataforma do Supabase
confirmado ao vivo na Onda 3 (grant automático de `EXECUTE` a `anon`/`authenticated` —
`scripts/db-drill/00-platform-baseline.sql`), aplica todas as migrations em ordem e
confirma as garantias de autorização contra o banco vivo resultante
(`scripts/db-drill/90-assertions.sql`). Roda também no CI
(`.github/workflows/db-schema-drill.yml`) a cada mudança em `supabase/migrations/**`.

**O que isso prova:** o schema é 100% reconstruível a partir do Git, e a reconstrução não
reintroduz nenhuma das falhas de autorização já corrigidas. **O que isso não prova:**
que um backup real de dado do Supabase restaura corretamente — isso só um restore real
comprova (§3.2).

### 3.2 Restore real de dado — **[HUMANO]**, não executado nesta Onda

Requer acesso ao painel do Supabase (Founder) e, dependendo do mecanismo (ver §2), pode
exigir criar um projeto Supabase temporário para o dry-run (decisão de custo/escopo do
PMO). Procedimento a seguir quando autorizado:

1. Confirmar em `Project Settings → Database → Backups` a lista de backups disponíveis
   para o projeto de **staging** (nunca testar restore contra produção primeiro).
2. Disparar um restore de teste — o Supabase restaura para o mesmo projeto (offline
   durante a operação) ou permite clonar para um projeto novo, dependendo do plano;
   confirmar qual modelo está disponível antes de prosseguir.
3. Após o restore, rodar contra o projeto restaurado:
   - `bun run verify-env:staging` (confirma que a env aponta pro projeto certo);
   - as queries de `docs/security/DATABASE-AUTHORIZATION-MATRIX.md` (grants, RLS,
     `has_function_privilege` para `approve_submission`) — o restore precisa preservar
     as mesmas garantias de autorização, não só os dados;
   - conferir contagem de linhas em `markets`/`products`/`prices` contra o esperado.
4. Medir o tempo total (do clique em "restore" até a confirmação do passo 3) — essa
   medição real substitui o RTO proposto em §2 por um número observado.
5. Documentar o resultado (sucesso/falha, tempo, discrepância) em um adendo a este
   runbook — nunca declarar este passo concluído sem essa evidência.
6. **Nunca** executar o passo 2 contra o projeto de produção sem repetir com sucesso em
   staging primeiro e sem autorização explícita do Founder/PMO para a janela de teste.

### 3.3 Rollback de deploy do Worker (já coberto, registrado aqui por completude)

Não depende de restore de dado — é reconstrução de código. Redeploy do commit anterior
via `workflow_dispatch` dos workflows `deploy-staging.yml`/`deploy-production.yml`
usando o SHA desejado, mesmo padrão já usado nas Ondas 2 e 3
(`docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`, seção de rollback).

## 4. Testes de falha realizados nesta Onda

| Teste                                                                         | Resultado                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aplicar todas as migrations do zero contra Postgres efêmero                   | Passa — 7 migrations, autorização confirmada (ver `bun run drill:schema-rebuild`)                                                                                                    |
| Reverter a migration corretiva da Onda 3 (`20260730120000`) e rodar o drill   | Falha corretamente — reporta `EXECUTE` indevido em `anon`/`authenticated` nas 4 funções, prova que o drill detecta a exata classe de regressão que causou o achado crítico da Onda 3 |
| `check-uptime` com header de segurança ausente / status != 200 / erro de rede | Marca `ok=false` e identifica a causa em todos os três cenários (`scripts/check-uptime.test.ts`)                                                                                     |

## 5. O que fica pendente para o Founder/PMO

- Confirmar o plano Supabase real (Free/Pro) e a retenção de backup efetiva de cada
  projeto — via painel, sem que o CTO precise de credencial nova.
- Autorizar (ou não) um restore de teste real em staging, incluindo se um projeto
  temporário precisa ser criado (implicação de custo).
- Revisitar o RPO/RTO proposto no §2 antes do Gate R0.
- Configurar alerting nativo do Cloudflare/Supabase no painel (e-mail/webhook), se
  desejado além do `uptime-check.yml` já implementado nesta Onda — configuração de
  conta, não código.
