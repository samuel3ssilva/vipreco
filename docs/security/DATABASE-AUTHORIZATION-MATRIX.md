# Matriz de autorização do banco — Onda 3

> **Leia antes da tabela.** A matriz abaixo foi montada a partir do **código versionado**, e por
> isso descreve o que as migrations concedem — não o que o banco tinha. R2.5 mediu staging e
> achou a diferença: `anon` e `authenticated` detinham 45 dos 48 privilégios de tabela do schema
> `public`, herdados do provisionamento da plataforma. Os `❌` de UPDATE e DELETE, e o TRUNCATE
> que a tabela nem representa, estavam errados. A correção, a medição e o estado atual estão em
> [§ Correção de R2.5/R2.6](#correção-de-r25r26--a-matriz-descrevia-a-intenção-não-o-banco), no
> fim deste documento.

Fonte: leitura integral de `supabase/migrations/` (4 arquivos, ordem cronológica confirmada,
cada um tocado por exatamente um commit — sem edição pós-aplicação) e `supabase/seed.sql`.
Estado ao vivo (staging `wjurqpclauwtbjhhvigy`, produção `wpgglxgddnekzojozqlm`) foi validado
estruturalmente no fechamento da Onda 2 (6 tabelas, 6 policies, 6 tabelas com RLS, 4 funções,
`pg_trgm` ativa em ambos) — os detalhes linha-a-linha abaixo vêm do código versionado, que é a
fonte da verdade para o que muda nesta Onda.

"Antes" = estado ao final da Onda 2 (`main` em `559e9f6`). "Depois" = estado ao final desta
Onda, após `20260729210000_harden_helper_function_grants.sql` e
`20260729223000_close_public_write_surfaces.sql` (checkpoint do PMO em 2026-07-29: fecha o
INSERT público de `price_submissions`, `product_watch_requests` e `decision_feedback` — nenhuma
delas tem superfície legítima de escrita pública no MVP atual).

## Tabelas

| Recurso                  | Role                    |                    SELECT                    |                         INSERT                         | UPDATE | DELETE | Policy aplicável                                           | Justificativa                                                                  | Antes                                                          | Depois                      |
| ------------------------ | ----------------------- | :------------------------------------------: | :----------------------------------------------------: | :----: | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------- |
| `markets`                | `anon`, `authenticated` |            ✅ (`is_active=true`)             |                           ❌                           |   ❌   |   ❌   | `"Mercados ativos sao publicos"`                           | Catálogo público, editorial (não escrito pela comunidade)                      | igual                                                          | igual                       |
| `markets`                | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | CI/migrations/backoffice                                                       | igual                                                          | igual                       |
| `products`               | `anon`, `authenticated` |            ✅ (`is_active=true`)             |                           ❌                           |   ❌   |   ❌   | `"Produtos ativos sao publicos"`                           | Catálogo público                                                               | igual                                                          | igual                       |
| `products`               | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | CI/migrations/backoffice                                                       | igual                                                          | igual                       |
| `prices`                 | `anon`, `authenticated` | ✅ (ativo + válido + produto/mercado ativos) |                           ❌                           |   ❌   |   ❌   | `"Precos validos sao publicos"`                            | Só o preço válido mais recente é público (principle #2 do CLAUDE.md)           | igual                                                          | igual                       |
| `prices`                 | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Única escrita real é via `approve_submission()` (SECURITY DEFINER, ver abaixo) | igual                                                          | igual                       |
| `price_submissions`      | `anon`, `authenticated` |                      ❌                      | ❌ (policy dormente — sem GRANT, RLS nunca é avaliada) |   ❌   |   ❌   | `"Visitantes podem enviar sugestoes pendentes"` (dormente) | Moderação pública fora do MVP; sem endpoint server-side/anti-abuso pronto      | ✅ (`status='pending'`, produto/mercado ativos, `comment`≤280) | **❌ — fechado nesta Onda** |
| `price_submissions`      | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Moderação server-side                                                          | igual                                                          | igual                       |
| `product_watch_requests` | `anon`, `authenticated` |                      ❌                      | ❌ (policy dormente — sem GRANT, RLS nunca é avaliada) |   ❌   |   ❌   | `"Visitantes podem registrar interesse"` (dormente)        | Etapa futura, sem superfície legítima no MVP atual                             | ✅ (produto ativo)                                             | **❌ — fechado nesta Onda** |
| `product_watch_requests` | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Backoffice                                                                     | igual                                                          | igual                       |
| `decision_feedback`      | `anon`, `authenticated` |                      ❌                      | ❌ (policy dormente — sem GRANT, RLS nunca é avaliada) |   ❌   |   ❌   | `"Visitantes podem enviar feedback"` (dormente)            | Sem superfície legítima de escrita pública no MVP atual                        | ✅ (produto ativo)                                             | **❌ — fechado nesta Onda** |
| `decision_feedback`      | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Backoffice                                                                     | igual                                                          | igual                       |

Todas as seis tabelas têm `ENABLE ROW LEVEL SECURITY` — nenhuma tabela exposta pela Data API
está sem RLS. Nenhuma sequence explícita existe (todas as PKs usam `gen_random_uuid()`), então
não há GRANT de sequence a auditar.

## Funções

| Função                      | SECURITY          | `search_path`     | EXECUTE (antes)                                     | EXECUTE (depois)                              | Justificativa                                                                               |
| --------------------------- | ----------------- | ----------------- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pa_normalize_text(text)`   | INVOKER (default) | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Usada só por trigger e índice funcional; nenhum caller externo precisa chamá-la diretamente |
| `pa_set_updated_at()`       | INVOKER (default) | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Função de trigger, só toca `NEW`                                                            |
| `pa_products_search_text()` | INVOKER (default) | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Função de trigger, só toca `NEW`                                                            |
| `approve_submission(uuid)`  | **DEFINER**       | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Única escrita legítima de `price_submissions` → `prices` — **correção crítica, ver abaixo** |

### Correção crítica (achado ao vivo no rollout de staging, 2026-07-30): `REVOKE ALL ... FROM PUBLIC` não bastava

A coluna "Antes" da tabela acima estava **errada** nas quatro linhas até este achado. A hipótese
original — de que `REVOKE ALL ... FROM PUBLIC` removia o `EXECUTE` para `anon`/`authenticated`,
porque o default do Postgres é conceder `EXECUTE` a `PUBLIC` — nunca foi verificada contra um
banco vivo (Docker indisponível durante toda a Onda 3; nenhuma revisão adversarial teve acesso a
banco). Ao aplicar `20260729210000_harden_helper_function_grants.sql` em staging e rodar a
verificação do passo 3 do plano de rollout, o resultado real mostrou `anon` e `authenticated` com
`EXECUTE` direto nas três funções auxiliares, apesar da migration já aplicada.

**Causa raiz:** o Supabase provisiona todo projeto com `ALTER DEFAULT PRIVILEGES` no nível de
plataforma, concedendo `EXECUTE` explicitamente a `anon`, `authenticated` e `service_role` em toda
função criada dali em diante no schema `public` — fora do nosso controle de versionamento. Esse
grant é direto (papéis nomeados), não mediado pelo pseudo-role `PUBLIC`. `REVOKE ... FROM PUBLIC`
só desfaz o default SQL-padrão (que também existe, mas é redundante aqui); não desfaz esse grant
direto da plataforma.

**Consequência mais grave — `approve_submission(uuid)` (Onda 1, `20260727155843`):** criada com o
mesmo padrão `REVOKE ALL ... FROM PUBLIC`. Sendo `SECURITY DEFINER` e a única função que escreve
em `prices` a partir de `price_submissions`, se `anon`/`authenticated` tiverem `EXECUTE` direto
nela (mesmo mecanismo confirmado nas três funções auxiliares), **qualquer visitante anônimo
poderia chamá-la via RPC (`POST /rest/v1/rpc/approve_submission`) e aprovar sua própria sugestão
de preço, ignorando por completo o fluxo de moderação** — desde a Onda 1, em produção incluída.

**Corrigido** em `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql`:
`REVOKE ALL ... FROM PUBLIC, anon, authenticated` nas quatro funções (as três auxiliares +
`approve_submission`), migration nova e não destrutiva (não edita as migrations já aplicadas, por
`CLAUDE.md`). Regressão estática nova em `supabase/function-execute-grants.test.ts` assume, de
propósito, o oposto do teste de `INSERT` em tabelas: estado inicial **concedido** (não revogado)
por papel, refletindo o comportamento real do Supabase — não o default teórico do Postgres.

`approve_submission`'s owner efetivo (necessário para avaliar o alcance real do
`SECURITY DEFINER`) **não é verificável a partir do repositório** — `NOT VERIFIED`, requer
`\df+ public.approve_submission` no banco vivo.

## Views, triggers, extensões, Storage, Auth

| Item      | Achado                                                                                                                                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Views     | Nenhuma view definida                                                                                                                                                                                                                                                                                                            |
| Triggers  | `markets_updated_at`, `products_search_text`, `prices_updated_at` — todos disparam funções já auditadas acima, sem escrita fora do registro sendo processado                                                                                                                                                                     |
| Extensões | `pg_trgm`, instalada em schema `extensions` (não polui `public`)                                                                                                                                                                                                                                                                 |
| Storage   | Nenhum bucket ou policy de Storage definido em migration versionada. **NOT VERIFIED** se existe bucket criado fora de versionamento — checagem read-only do painel recomendada no checkpoint                                                                                                                                     |
| Auth      | `supabase/config.toml` não tem seção `[auth]` — configuração de signup/redirect/confirmação vive só no painel hospedado, fora de controle de versão. **NOT VERIFIED** — nenhuma interface de login existe no app (confirmado por grep, Fase C), mas o estado exato do Auth do projeto hospedado não é auditável pelo repositório |

## `is_demo` — não é fronteira de RLS

`is_demo` existe em `markets`, `products` e `prices`, mas nenhuma policy de SELECT o referencia.
É um rótulo de proveniência, não um controle de acesso — o isolamento real entre dado fictício e
dado real é inteiramente procedural (só `staging` recebe `supabase/seed.sql`; produção foi
confirmada com 0 linhas nas três tabelas no fechamento da Onda 2). Mudar isso exigiria RLS
adicional condicionada a `is_demo`, uma decisão de produto fora do escopo desta correção pontual
— registrado como risco residual aceito no threat model.

## Mudanças aplicadas nesta Onda

1. `supabase/migrations/20260729210000_harden_helper_function_grants.sql`: `REVOKE ALL
... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role` nas três funções auxiliares.
2. `supabase/migrations/20260729223000_close_public_write_surfaces.sql` (checkpoint do PMO):
   `REVOKE INSERT ... FROM anon, authenticated` em `price_submissions`, `product_watch_requests`
   e `decision_feedback`. Não destrutiva — nenhuma tabela, coluna ou policy foi removida; as três
   policies de INSERT continuam definidas no catálogo, agora dormentes (sem o `GRANT`
   correspondente, o Postgres nunca chega a avaliar a `USING`/`WITH CHECK` da policy — o
   privilégio de tabela é checado antes da RLS). `service_role` inalterado em todas as três.
   **Efeito de produto (resolvido no segundo ajuste do PMO):** os três fluxos de UI que escreviam
   nessas tabelas (`SubmitPriceForm`, `registerWatchRequest`, `DecisionFeedback`) não são mais
   renderizados em nenhuma rota pública — estrutura preservada e interface pública não renderizada
   enquanto a superfície de escrita permanecer fechada. Os componentes e a função continuam no
   repositório, sem exclusão destrutiva; `src/routes/produto.$productId.tsx` simplesmente não os
   importa nem os monta, e `PriceCard` não expõe mais o callback (`onReport`) que abria o
   formulário a partir de cada card. Ver `docs/security/THREAT-MODEL-ONDA-3.md` §5.2 e
   `src/routes/produto.$productId.public-surfaces.test.ts`.

Nenhuma outra tabela, policy ou RLS foi alterada — a auditoria não encontrou nenhuma policy
permissiva demais, nenhum `GRANT ALL` desnecessário e nenhuma tabela sem RLS.
**A parte em itálico desta frase estava errada, e a correção está em §"Correção de R2.5/R2.6"
abaixo:** _nenhum `GRANT ALL` desnecessário_ descrevia o que as migrations concediam, não o que
o banco tinha. Ambas as migrations
ficam `NOT VERIFIED` contra um Postgres ao vivo nesta sessão (Docker indisponível no host de
desenvolvimento) — revisão feita por leitura de assinatura/semântica e por uma suíte de testes
estáticos (`supabase/close-public-write-surfaces.test.ts`) que resolve o estado final de GRANT/
REVOKE lendo todas as migrations em ordem cronológica. A verificação contra banco vivo (leitura
pública preservada, INSERT anônimo rejeitado) é o passo 5/11 do plano de rollout — ver
`docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`.

---

## Correção de R2.5/R2.6 — a matriz descrevia a intenção, não o banco

Esta seção corrige a tabela acima. Ela não a apaga: o erro e sua causa são a parte útil.

### O que estava errado

Todos os `❌` de `anon`/`authenticated` nas colunas UPDATE e DELETE — e o `❌` implícito de
TRUNCATE, que a tabela nem tinha coluna para representar — foram derivados de **leitura das
migrations**, como o cabeçalho deste documento diz com todas as letras: _"os detalhes
linha-a-linha abaixo vêm do código versionado"_. As migrations de fato não concediam esses
privilégios. O banco os tinha assim mesmo.

A plataforma Supabase aplica, no provisionamento e fora deste repositório, um
`ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` para `anon`, `authenticated` e
`service_role` no schema `public`. Toda tabela criada por uma migration nasceu, portanto, com
o conjunto completo de privilégios para os dois papéis públicos — sem que migration nenhuma
pedisse, e sem que auditoria nenhuma que lesse apenas migrations pudesse ver.

Medição em staging (R2.5, runs [31042845838](https://github.com/samuel3ssilva/vipreco/actions/runs/31042845838)
e [31048646955](https://github.com/samuel3ssilva/vipreco/actions/runs/31048646955)):

| Papel           | Privilégios de tabela em `public` | De 48 possíveis (6 tabelas × 8)   |
| --------------- | --------------------------------: | --------------------------------- |
| `anon`          |                            **45** | faltavam só os 3 INSERT da Onda 3 |
| `authenticated` |                            **45** | idem                              |
| `service_role`  |                                48 | esperado                          |
| dono do schema  |                                48 | esperado                          |

Os 3 ausentes são exatamente os 3 `REVOKE INSERT` de `20260729223000`. Ou seja: a Onda 3
revogou o único privilégio que alguém sabia existir, porque era o único que uma migration
havia concedido. Todo o resto seguiu de pé.

### Por que TRUNCATE era o achado grave, e os outros não

Para INSERT, UPDATE e DELETE, a RLS segura: as seis tabelas têm `rls=on`, e sem policy para o
comando a operação é negada mesmo com o privilégio. O privilégio sobrando é defesa em
profundidade perdida, não porta aberta.

**TRUNCATE é diferente. No PostgreSQL a RLS não se aplica a TRUNCATE** — a operação é de tabela
inteira e é governada exclusivamente pelo privilégio. Não existe policy que a negue. O único
motivo pelo qual `anon` não apagava `prices` inteira era o PostgREST não expor verbo para a
operação, e `anon` ser `NOLOGIN`. Isso é proteção morando na camada HTTP, não no banco — e uma
proteção que depende de o cliente não conseguir pedir não é proteção, é coincidência com prazo
de validade.

### Estado corrigido — tabelas centrais (`20260803005000`)

| Recurso                         | `anon` / `authenticated` | `PUBLIC` | `service_role` |
| ------------------------------- | ------------------------ | -------- | -------------- |
| `markets`, `products`, `prices` | **SELECT apenas**        | nada     | GRANT ALL      |

SELECT permanece porque ler preço, mercado e produto **é** o produto; a RLS filtra quais linhas
aparecem. INSERT, UPDATE, DELETE e TRUNCATE revogados de `anon`, `authenticated` e `PUBLIC`.

### Estado corrigido — tabelas de contribuição (`20260803007500`)

| Recurso                                                            | `anon` / `authenticated` | `PUBLIC` | `service_role` |
| ------------------------------------------------------------------ | ------------------------ | -------- | -------------- |
| `price_submissions`, `product_watch_requests`, `decision_feedback` | **nada**                 | nada     | GRANT ALL      |

`REVOKE ALL PRIVILEGES`. Classificação privilégio a privilégio:

| Privilégio                    | Classe                  | Decisão e por quê                                                                                                                                                                                                                           |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INSERT                        | já fechado na Onda 3    | A regra é preservar INSERT só quando houver **policy ativa E contrato funcional** que ainda permita submissão pública. A policy existe (dormente); o contrato não — `CLAUDE.md` princípio 5 é explícito. Revogação reafirmada, idempotente. |
| UPDATE, DELETE                | **perigoso**            | Nunca houve contrato de alterar ou apagar contribuição alheia. A policy que segura hoje é `FOR INSERT` — ela não cobre nem poderia cobrir estas.                                                                                            |
| TRUNCATE                      | **perigoso**            | RLS não se aplica. Mesmo raciocínio das tabelas centrais.                                                                                                                                                                                   |
| SELECT                        | herdado e desnecessário | Nenhuma das três tem policy de SELECT, e nenhum caminho do aplicativo as lê (`src/services/catalog.ts` só faz `.insert()`, e esses controles não são renderizados desde a Onda 3). Leitura é trabalho de `service_role`.                    |
| REFERENCES, TRIGGER, MAINTAIN | herdado e desnecessário | `anon` e `authenticated` são `NOLOGIN` e não criam objeto nenhum.                                                                                                                                                                           |

Como não sobra nada a preservar, o comando é `REVOKE ALL PRIVILEGES` — que ainda tem a virtude
de não depender da versão do PostgreSQL (`MAINTAIN` só existe a partir do 17; nomear privilégio
a privilégio quebraria contra o 16 do drill).

### Herança futura

`20260803005000` cortou do `ALTER DEFAULT PRIVILEGES` os quatro privilégios de escrita.
`20260803007500` cortou a herança inteira (`REVOKE ALL ON TABLES`). A partir daí, **tabela nova
em `public` não dá nada a `anon` nem a `authenticated` por herança** — toda tabela que precise
ser lida publicamente exige `GRANT SELECT` explícito na própria migration.

Isso já era o padrão do repositório (`markets`, `products` e `prices` sempre tiveram `GRANT
SELECT` explícito na migration inicial), então não há regressão; há o fim de uma rede de
segurança que ninguém pediu e que só servia para conceder acesso sem que ninguém decidisse.
Falhar fechado é a direção certa: tabela nova que não aparece na API é um bug óbvio de dois
minutos; tabela nova exposta sem ninguém ter decidido é o achado desta seção.

**A armadilha do `ALTER DEFAULT PRIVILEGES`**, registrada porque ela produz o pior resultado
possível: sem `FOR ROLE`, o comando aplica ao papel da **sessão**. Se quem criou as tabelas for
outro papel, ele roda, devolve sucesso e não desfaz nada — gate verde sobre banco inalterado.
As duas migrations leem `pg_default_acl` e emitem um `ALTER ... FOR ROLE` por papel encontrado,
em vez de chutar. A auditoria read-only que mede isso antes da aplicação é
`scripts/r2/preflight/50-privileges.sql`.

### O que passou a ser verificado, e onde

| Garantia                                                   | Onde falha se quebrar                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Nenhum privilégio público nas três tabelas de contribuição | `90-assertions.sql` bloco 3, e a autoverificação da própria migration |
| Nenhuma escrita pública nas três tabelas centrais          | `90-assertions.sql` bloco 3B                                          |
| `PUBLIC` sem escrita direta nas seis                       | `90-assertions.sql` bloco 3C (`relacl`, `grantee = 0`)                |
| Tabela futura não herda nada                               | `90-assertions.sql` bloco 3D                                          |
| **O papel tinha o privilégio antes** (controle positivo)   | `90-assertions.sql` bloco 3E + `01-acl-control.sql`                   |
| `service_role` não foi atingido (controle negativo)        | `90-assertions.sql` bloco 3F, e a autoverificação da migration        |
| Policies e RLS preservadas                                 | `90-assertions.sql` blocos 1 e 3H                                     |
| Rollback documentado executa, e a reaplicação restaura     | `95-rollback-reapply.sh` (0 → 36 → 0 privilégios)                     |

O controle positivo do bloco 3E é o que impede esta correção de repetir o erro que ela corrige.
`_drill_controle_de_acl` nasce no baseline sob o mesmo default privilege das seis tabelas reais
e nenhuma migration a toca: privilégio presente nela e ausente nas seis é a prova de que a
revogação é **efeito das migrations**, e não um banco que nunca teve o grant. Sem esse par,
"`anon` não tem DELETE" é uma frase que passa idêntica nos dois mundos — e foi assim que o drill
ficou verde por dois meses enquanto staging tinha 42 privilégios de escrita por papel.
