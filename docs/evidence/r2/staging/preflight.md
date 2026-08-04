# Preflight remoto de staging — R2

**Medido em 2026-08-04, entre 09:20 e 09:50 UTC.** `main` em `e203887`, árvore limpa,
734 testes verdes.

Tudo abaixo foi obtido **somente com `GET` e `HEAD`** na Data API pública de staging, com a
chave _publishable_ (anônima) que já está em `.env` e já é pública por desenho — a mesma que
o navegador de qualquer visitante carrega. Nenhuma escrita, nenhum `service_role`, nenhuma
conexão direta ao Postgres, nenhum comando `supabase`.

---

## 1. Identificação dos ambientes (§3)

|                         | staging                         | production                              |
| ----------------------- | ------------------------------- | --------------------------------------- |
| project ref (últimos 6) | `…hhvigy`                       | `…jozqlm`                               |
| host `sha256[0:12]`     | `2a3597552e07`                  | não calculado — banco não foi contatado |
| Worker                  | `samuel3ssilva-vipreco`         | `vipreco-production`                    |
| arquivo local           | `.env`                          | `.env.production`                       |
| `bun run verify-env:*`  | OK                              | OK                                      |
| deployment mais recente | `862a179`, 2026-08-02T01:09:52Z | `b88e514`, 2026-07-30T12:32:40Z         |

Fontes independentes que concordam entre si: `config/environments.json`, `supabase/config.toml`
(que aponta para o ref de **staging**), os dois arquivos `.env*`, os GitHub Environments
`staging` e `production`, e os registros de deployment da API do GitHub.

Os dois refs são diferentes, os dois Workers são diferentes, e a única credencial usada nesta
missão resolve para staging — confirmado por `verify-env`, que compara valor a valor contra
`config/environments.json` antes de qualquer requisição.

**O banco de produção não foi contatado em nenhum momento.** A única leitura de produção foi
o `GET` no Worker público (§8 abaixo), que é a interação que o mandato permite.

---

## 2. Credenciais realmente disponíveis (§0)

Este é o achado que decide a missão.

| Credencial                  | Existe aqui?                                  | Onde foi procurada                                                                                             |
| --------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| chave _publishable_ (anon)  | **sim**                                       | `.env`, `.env.production`, GitHub Environment secrets                                                          |
| `SUPABASE_SERVICE_ROLE_KEY` | **não**                                       | idem — e `scripts/deploy-config-consistency.test.ts` tem um teste que **proíbe** o nome aparecer nos workflows |
| senha do Postgres           | **não**                                       | `.env*`, secrets de ambiente, variáveis exportadas                                                             |
| `SUPABASE_ACCESS_TOKEN`     | **não**                                       | idem, e `~/.supabase` (só telemetria)                                                                          |
| CLI `supabase`              | **não instalada**                             | `which supabase` → não encontrado                                                                              |
| `gh` autenticado            | sim, escopos `gist, read:org, repo, workflow` | `gh auth status`                                                                                               |

Consequência direta: **não existe, neste ambiente, nenhum caminho técnico para aplicar
migration, escrever linha ou ler catálogo do sistema em staging.** Não é uma escolha de
prudência; é ausência de credencial. `supabase db push`, `migration up`, `psql` e o editor
SQL do painel estão todos fora de alcance.

Isso não foi contornado, e não deve ser: o mandato proíbe criar credencial alternativa,
pedir segredo no chat e burlar autenticação.

---

## 3. Histórico remoto de migrations (§4) — estado **E. UNKNOWN**

`supabase_migrations.schema_migrations` vive fora do schema exposto pela Data API. As duas
tentativas devolveram `PGRST205` (tabela não encontrada no schema exposto), que é o
comportamento correto e esperado: o histórico de migrations **não deve** ser legível pelo
anônimo.

| Tentativa                                            | Resultado             |
| ---------------------------------------------------- | --------------------- |
| `GET /rest/v1/schema_migrations`                     | HTTP 404 · `PGRST205` |
| `GET /rest/v1/supabase_migrations.schema_migrations` | HTTP 404 · `PGRST205` |

Classificação segundo §4: **E. UNKNOWN — leitura insuficiente.** Não é B ("history missing"):
não foi observado que o histórico esteja faltando, e sim que ele é ilegível com a credencial
disponível. A diferença importa, porque B descreveria o **banco** e E descreve a **medição**.

Só o estado A autoriza aplicação. Este não é A.

Nada foi feito para contornar: nenhum `migration repair`, nenhuma marcação artificial de
versão, nenhuma inserção manual no histórico, nenhum `db reset`.

---

## 4. Fingerprint de schema (§5) — colunas **sem divergência**

O `GRANT SELECT ON public.<tabela> TO anon` das migrations é de tabela inteira, não de
coluna. Logo o conjunto de colunas que a Data API devolve **é** o conjunto de colunas da
tabela — não um subconjunto autorizado.

| Tabela     | Colunas esperadas (8 migrations anteriores a R2) | Colunas encontradas | Divergência |
| ---------- | ------------------------------------------------ | ------------------- | ----------- |
| `products` | 12                                               | 12                  | nenhuma     |
| `markets`  | 10 (9 + `city`, de `20260727155726`)             | 10                  | nenhuma     |
| `prices`   | 14                                               | 14                  | nenhuma     |

E a sonda coluna a coluna em `products`, que é o que R2-A vai alterar:

| Coluna              | HTTP | Código  | Leitura                             |
| ------------------- | ---- | ------- | ----------------------------------- |
| `gtin`              | 200  | —       | presente, como esperado             |
| `size_text`         | 200  | —       | presente, como esperado             |
| `search_text`       | 200  | —       | presente, como esperado             |
| `package_type`      | 400  | `42703` | **ausente** — R2-A não foi aplicada |
| `quantity_value`    | 400  | `42703` | **ausente** — idem                  |
| `quantity_unit`     | 400  | `42703` | **ausente** — idem                  |
| `units_per_package` | 400  | `42703` | **ausente** — idem                  |

`42703` é `undefined_column`, não `42501` (`insufficient_privilege`). A distinção é o que
transforma isso em prova: o erro diz que a coluna **não existe**, e não que ela existe e
está negada.

### O que este fingerprint **não** alcança — `NOT VERIFIED`

Índices, constraints, funções, triggers, estado da RLS, texto das policies, grants e
extensões **não** foram verificados. Todos moram no catálogo do sistema, que o anônimo não
lê. Duas observações indiretas, e nada além disso:

- a RLS de `prices` está ativa e filtrando: das 22 linhas do seed versionado, o anônimo vê
  16 — exatamente as que a policy de validade deixa passar. Uma RLS desligada devolveria 22;
- as sondas de RPC em `pa_normalize_text`, `pa_is_valid_gtin`, `pa_gtin_check_digit` e
  `approve_submission` devolveram todas `PGRST202`. Isso **não** prova ausência: `PGRST202`
  também é o que aparece quando a função existe e o anônimo não pode executá-la — que é
  justamente o estado que a Onda 3 instalou de propósito. A sonda não distingue os dois
  casos, então não distingue nada.

---

## 5. Classificação dos dados (§6)

Contagens visíveis ao anônimo, com `Prefer: count=exact`:

| Tabela                   | Visível ao anon | No seed versionado | Policy do anon                               |
| ------------------------ | --------------- | ------------------ | -------------------------------------------- |
| `products`               | 7               | 7                  | `is_active = true`                           |
| `markets`                | 4               | 4                  | `is_active = true`                           |
| `prices`                 | 16              | 22                 | preço válido (ativo, observado, não vencido) |
| `price_submissions`      | 0               | 0                  | sem SELECT público                           |
| `product_watch_requests` | 0               | 0                  | idem                                         |
| `decision_feedback`      | 0               | 0                  | idem                                         |

Sobre as linhas visíveis:

- **todas** têm `is_demo = true`; nenhuma tem `is_demo = false`;
- todos os `id` seguem o padrão de UUID do seed (`22222222-…`, `11111111-…`);
- todos os `created_at` de `products` são **o mesmo instante**, `2026-07-27T23:56:43.029164Z`
  — uma única execução de seed, nunca repetida;
- nenhum campo de pessoa foi lido, porque nenhuma tabela pública tem campo de pessoa.

### Classificação: **DEMO ONLY entre o que é visível; UNKNOWN no resto**

A policy de `products` e a de `markets` filtram por `is_active`. Como o anônimo vê exatamente
as 7 e as 4 linhas do seed, **não existe produto nem mercado ativo fora do seed em staging** —
isso é conclusivo. O que permanece indeterminado é o conjunto de linhas **inativas**, que a
policy esconde e que só `service_role` enumeraria.

Portanto: nenhuma evidência de dado real, e uma faixa que a credencial disponível não alcança.
Pelo critério do §6 isso não é "DEMO ONLY" comprovado, e sim **MIXED OR UNKNOWN por limite de
medição** — a rigor, `UNKNOWN`. Nada foi apagado para melhorar essa classificação.

---

## 6. Auditoria de GTIN (§8) — **duas linhas inválidas**

Executada a aritmética GS1 da consulta 2 de `scripts/r2/target-readiness.sql`, sobre os
GTINs realmente presentes em staging.

| Métrica                              | Valor |
| ------------------------------------ | ----- |
| GTIN preenchido                      | 7     |
| GTIN nulo                            | 0     |
| comprimentos distintos               | 13    |
| com espaço                           | 0     |
| com caractere não-ASCII              | 0     |
| duplicados                           | 0     |
| **inválidos por dígito verificador** | **2** |

| `product_id`              | GTIN (mascarado) | Motivo                                        |
| ------------------------- | ---------------- | --------------------------------------------- |
| `22222222-…-000000000002` | `*********2345`  | dígito verificador errado — o correto seria 7 |
| `22222222-…-000000000007` | `*********4321`  | dígito verificador errado — o correto seria 3 |

### Isto é _drift de dado_, e a correção já existe versionada

Os dois produtos são o **Café Pilão 500 g** e o **Café Pilão 250 g**. No `supabase/seed.sql`
da `main` de hoje, os dois têm `gtin = NULL`: o commit `1102967` (PR #53, 2026-08-03) removeu
exatamente esses dois códigos fictícios inválidos, com a justificativa de que
"um GTIN válido pertence a algum produto real, e estes produtos são fictícios".

Staging foi semeado em **2026-07-27**, antes daquela correção, e nunca foi re-semeado. Ou
seja: o repositório está correto e o ambiente está velho. Não há nada a curar — o valor certo
para essas duas linhas já está decidido e é `NULL`.

### O que isso faz com R2-B

Duas coisas diferentes, e confundi-las seria o erro:

1. **Aplicar R2-B funcionaria.** A constraint nasce `NOT VALID`, e `NOT VALID` por definição
   não confere linha existente. As duas linhas ruins passariam despercebidas na aplicação.
2. **A FASE 6 falharia.** `VALIDATE CONSTRAINT` confere todas as linhas, e essas duas
   reprovariam — que é precisamente o que o commit `1102967` previu: _"no dia em que essa
   constraint existir o próprio seed deixa de aplicar."_

O Gate G8 do mandato ("zero GTIN inválido") bloqueia R2-B em staging por causa de (2), e é o
bloqueio correto: ele mostra o problema agora, com um relatório, em vez de mais adiante, no
meio de uma janela de manutenção.

**Não foi corrigido nesta missão.** Corrigir é escrita, exige `service_role`, e escrita não
está autorizada aqui. A ação recomendada está no §10 de [`application.md`](./application.md).

---

## 7. Preview de quantidade (§9) — 7 linhas, nenhuma escrita

`scripts/backfill-preview.ts` rodou sobre os `size_text` reais de staging, obtidos com um
`SELECT` da Data API. O script não abre conexão nem lê credencial: recebe um arquivo JSON.

| Estado            | Linhas | %    |
| ----------------- | ------ | ---- |
| `proposta_segura` | 7      | 100% |
| `ambigua`         | 0      | 0%   |
| `nao_suportada`   | 0      | 0%   |
| `ausente`         | 0      | 0%   |
| `conflito`        | 0      | 0%   |
| `exige_revisao`   | 0      | 0%   |

Código de saída **0** (`LIMPO` — sucesso sem item para revisão).

Seis das sete linhas propõem quantidade e deixam `package_type` e `units_per_package` em
`null`, com a ação "conferir a embalagem e preencher `package_type`". A sétima (`12 rolos`)
é lida como pack pelo método `count_word` e propõe as quatro colunas.

Confirmações exigidas pelo §9, todas verdadeiras nesta execução:

- nenhuma escrita, nenhum `UPDATE`, nenhuma conexão — o script recebe JSON e imprime texto;
- `parsed` não virou `confirmed`: as sete saíram como **proposta**, e o próprio relatório
  encerra com "aprovar é ato humano";
- nenhum texto de peso variável e nenhum texto com múltiplos números apareceu neste lote —
  logo estes dois caminhos **não foram exercitados** contra dado de staging, e continuam
  cobertos só pelos testes unitários;
- unidade desconhecida não ganhou fator, porque não houve unidade desconhecida;
- saída determinística: duas execuções seguidas produziram texto idêntico;
- nenhum `service_role` envolvido.

Este preview **não bloqueia R2-A**: as quatro colunas nascem _nullable_ e a migration não faz
backfill.

---

## 8. Smoke test do deployment existente (§13) — sem deploy novo

Nenhum deploy foi feito. O que existe hoje foi apenas visitado com `GET`.

| Rota (staging)                     | HTTP | Bytes  |
| ---------------------------------- | ---- | ------ |
| `/`                                | 200  | 34 902 |
| `/buscar`                          | 200  | 12 074 |
| `/buscar?q=cafe`                   | 200  | 12 696 |
| `/produto/22222222-…-000000000002` | 200  | 23 209 |
| `/como-funciona`                   | 200  | 18 370 |
| `/para-mercados`                   | 200  | 30 043 |
| `/robots.txt`                      | 200  | 23     |
| `/sitemap.xml`                     | 200  | 538    |

A página de produto renderiza a comparação real: título "Café Pilão Tradicional 500 g",
faixa "AMBIENTE DE TESTE", "2 mercados", melhor preço, selo de fonte "Foto da etiqueta",
seção "Preços por mercado" com a ordem do menor para o maior. Nenhuma string de erro,
nenhum `500`, nenhuma menção a coluna inexistente.

E `bun scripts/check-uptime.ts`, que é o mesmo verificador do workflow agendado:

| Worker     | Resultado                              |
| ---------- | -------------------------------------- |
| staging    | 200, **todos** os headers de segurança |
| production | 200, **todos** os headers de segurança |

A verificação de produção é um `GET` no Worker público — a única interação com produção que
o §18 permite, e a única que houve.

---

## 9. Backup e restauração (§7)

Nada mudou desde a investigação da Onda 4, registrada em
[`../../../operations/RESILIENCE-RUNBOOK.md`](../../../operations/RESILIENCE-RUNBOOK.md) §2 e §6:

| Pergunta                                | Resposta                                   |
| --------------------------------------- | ------------------------------------------ |
| backup automático no plano atual (Free) | **não existe nenhum**                      |
| último backup                           | **não há**                                 |
| retenção                                | não se aplica                              |
| restauração possível hoje               | **não**, não há artefato de onde restaurar |
| responsável                             | Founder (é quem tem acesso ao painel)      |

O §7 do mandato admite como substituto a "evidência de que o staging está vazio e pode ser
reconstruído integralmente pelas migrations e seeds". Staging **não** está vazio, mas o que
ele contém é reconstruível — e o `db-schema-drill` prova essa reconstrução contra Postgres
vivo a cada mudança de migration.

Com uma ressalva que este preflight acabou de descobrir e que precisa ficar escrita: a
reconstrução **não reproduziria staging exatamente**. Ela produziria o seed corrigido, sem os
dois GTINs inválidos do §6. Nesse caso específico a diferença é um ganho — mas "reconstruível"
e "idêntico" não são a mesma afirmação, e só a primeira é verdadeira.

Nenhum backup lógico foi criado nesta missão: criar um exigiria `pg_dump` com credencial de
banco, que não existe aqui (§2).

---

## 10. O que foi tocado

Nada. Nenhum `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, `DROP`, `TRUNCATE`, `GRANT` ou
`REVOKE` foi emitido contra ambiente algum. Nenhuma migration foi aplicada. Nenhum deploy foi
disparado. Nenhum secret foi criado, lido em texto claro, alterado ou impresso. Nenhum DNS,
nenhum Worker, nenhuma RLS, nenhum ranking, nenhuma interface.
