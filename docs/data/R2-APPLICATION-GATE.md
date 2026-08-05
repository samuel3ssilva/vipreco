# Gate de aplicação remota de R2

**Status: NORMATIVO.** Este documento define quem autoriza a aplicação das migrations de
R2, sob quais condições, e o que explicitamente **não** está autorizado.
Procedimento operacional: [`R2-ROLLOUT-RUNBOOK.md`](./R2-ROLLOUT-RUNBOOK.md).
Decisão de governança: [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) DL-020.

---

## A regra

> **Merge no Git não é aplicação no banco.**

As migrations de R2 estão na `main`. Isso autoriza **a existência delas**, e mais nada.
Aplicar em staging ou em produção é decisão do Founder/PMO, tomada explicitamente, para um
ambiente por vez (princípio 14 do `CLAUDE.md`).

O CTO escreve migration. O Founder/PMO decide aplicar. As duas coisas não se substituem, e
nenhuma quantidade de teste verde troca a segunda pela primeira.

---

## Estado atual

| Item                                           | Estado                                             |
| ---------------------------------------------- | -------------------------------------------------- |
| `20260803010000_product_identity_quantity.sql` | versionada na `main`, **não aplicada**             |
| `20260803020000_gtin_integrity.sql`            | versionada na `main`, **não aplicada**             |
| Backfill de quantidade (MVP-E1-08)             | **não iniciado**                                   |
| `VALIDATE CONSTRAINT`                          | **não executado** em constraint nenhuma            |
| Conteúdo de `products` em staging              | **parcialmente medido em 04/08/2026** — ver abaixo |
| Conteúdo de `products` em produção             | **NOT VERIFIED** — banco nunca contatado           |

O último item é o motivo de **todas** as constraints nascerem `NOT VALID`. Sem saber o que
existe no ambiente alvo, uma constraint validada na criação poderia falhar a aplicação
inteira; `NOT VALID` passa a valer para escrita nova imediatamente e adia a conferência das
linhas antigas para um passo que **pode falhar de propósito**.

### O que o preflight de 04/08/2026 mediu em staging

Medido só com `GET`/`HEAD` na Data API pública, com a chave _publishable_. Evidência completa
em [`../evidence/r2/staging/`](../evidence/r2/staging/README.md); decisão em DL-022.

| Achado                                                                   | Estado                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| colunas de `products`, `markets` e `prices`                              | **sem divergência** em relação às 8 migrations anteriores a R2 |
| as 4 colunas de R2-A                                                     | **ausentes** (`42703`) — R2-A não foi aplicada                 |
| GTIN inválido em `products`                                              | **2 linhas** — bloqueia a FASE 6, não a aplicação de R2-B      |
| GTIN duplicado                                                           | 0                                                              |
| preview de quantidade                                                    | 7 linhas, todas `proposta_segura`, nenhuma escrita             |
| histórico de migrations, índices, constraints, funções, policies, grants | **NOT VERIFIED** — exigem catálogo do sistema                  |

E o motivo de tudo acima parar aqui: **não existe credencial de escrita nem de leitura de
catálogo** neste ambiente — sem `service_role`, sem senha de banco, sem access token, sem CLI.
A aplicação em staging permanece bloqueada por `CREDENTIAL ACCESS REQUIRED`.

### O caminho para responder o que ficou `NOT VERIFIED` (R2.3, 04/08/2026)

As seis últimas linhas da tabela acima ficaram `NOT VERIFIED` porque exigem o catálogo do
sistema, e a chave anônima não o enxerga. Isso deixou de ser um beco: existe agora um caminho
**automatizado, read-only e auditável** para respondê-las —
[`.github/workflows/r2-staging-preflight.yml`](../../.github/workflows/r2-staging-preflight.yml),
documentado em [`../evidence/r2/automation.md`](../evidence/r2/automation.md).

O que muda para este gate:

| Antes                                                      | Depois                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| responder G3/G4/G5 exigiria alguém rodar SQL à mão         | um `workflow_dispatch` responde, e registra a resposta num Job Summary      |
| a credencial passaria por chat, `.env` ou área de trabalho | fica em **Environment Secret** `SUPABASE_DB_PASSWORD` do ambiente `staging` |
| "read-only" seria uma promessa de quem executa             | é estrutural: guarda estática, transação `READ ONLY` e verificação no banco |
| nada impediria apontar para produção por engano            | o host é **derivado** do ref de staging versionado, e não cadastrado à mão  |

O que **não** muda: nada disso aplica migration. O workflow não tem modo `apply`, e a
autorização continua sendo do Founder/PMO, ambiente por ambiente, como manda o princípio 14 do
`CLAUDE.md`.

**Estado em 05/08/2026:** o preflight **leu o banco** (run `31032153539`). O bloqueio mudou de
natureza cinco vezes antes disso, e o registro dessas mudanças é o que impede repetir a
investigação errada:

| Data  | Bloqueio                           | O que era                                                        |
| ----- | ---------------------------------- | ---------------------------------------------------------------- |
| 03/08 | `CREDENTIAL ACCESS REQUIRED`       | não existia caminho automatizado nenhum                          |
| 04/08 | `STAGING SECRET REQUIRED`          | o caminho existia, e o segredo não estava cadastrado             |
| 05/08 | `STAGING CREDENTIAL REJECTED`      | o segredo existia, e cinco defeitos do runner o corrompiam       |
| 05/08 | `STAGING PASSWORD SECRET REQUIRED` | o runner foi refeito; faltava cadastrar `SUPABASE_DB_PASSWORD`   |
| 05/08 | `Network is unreachable`           | o host derivado era o da conexão direta, IPv6-only               |
| 05/08 | **lido**                           | pooler IPv4, usuário `postgres.<ref>`: 9 PASS, 6 FAIL, 0 UNKNOWN |

**Nenhum dos seis bloqueios foi do banco.** Todos foram da ferramenta, e é por isso que a
linha final importa mais do que parece: a partir dela, um `FAIL` volta a ser uma afirmação
sobre staging.

A R2.3D trocou o segredo composto pelo **atômico**: `SUPABASE_DB_PASSWORD` carrega só a senha,
e host, porta, usuário e banco são derivados de `config/environments.json`. A montagem manual de
URI — que produziu os cinco defeitos, todos silenciosos e todos disfarçados de
`password authentication failed` — deixou de existir. Ver
[`../../scripts/r2/preflight/prepare-credential.sh`](../../scripts/r2/preflight/prepare-credential.sh)
e [`../evidence/r2/automation.md`](../evidence/r2/automation.md) §8D.

Os dois GTINs inválidos **não são curadoria pendente**: são as duas linhas que o commit
`1102967` já anulou no `supabase/seed.sql`, e que staging não recebeu porque foi semeado antes
daquela correção. Realinhar staging com o seed versionado resolve o item — e é escrita, logo é
decisão do Founder/PMO.

---

## Gate consolidado G1–G15 (R2.4, 05/08/2026)

Todos precisam estar `PASS` antes da aplicação. Os vereditos decidíveis por leitura saem do
preflight; os demais são decisão humana registrada aqui.

| #          | Condição                                                          | Como se decide                                                    |
| ---------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| G1         | staging identificado sem ambiguidade                              | usuário `postgres.<ref>` derivado de `config/environments.json`   |
| G2         | production é outro projeto, e não foi contatada                    | refs diferentes provados; a conexão aborta se mencionar produção  |
| G3         | baseline histórico adotado **com equivalência comprovada**         | `r2-schema-equivalence.yml` + `migration repair` das 8 versões    |
| G4         | schema legado equivalente                                          | nenhuma coluna de R2-A presente                                   |
| G5         | dados afetados `DEMO ONLY`                                         | contagens, incluindo linhas inativas — ver a ressalva abaixo      |
| G6-STAGING | staging reconstruível segundo a política aprovada                  | ver **STAGING DISPOSABLE REBUILD POLICY**, abaixo                 |
| G7-PRE     | prontidão do schema legado                                         | `target-readiness-pre.sql` roda por inteiro **antes** de aplicar  |
| G7-POST    | verificação pós-aplicação                                          | `target-readiness-post.sql`, **depois** de aplicar                |
| G8         | zero GTIN inválido ou duplicado                                    | aritmética GS1 em linha, sobre os GTINs que existem               |
| G9         | preview read-only de quantidade                                    | `preview-counts.ts`, sem escrever                                 |
| G10        | drill e rollback                                                   | `db-schema-drill-required` verde                                  |
| G11        | CI e CodeQL                                                        | verdes na revisão aplicada                                        |
| G12        | nenhum deploy automático                                           | R2 não tem superfície de interface                                |
| G13        | nenhum dado pessoal ou crítico afetado                             | ver a ressalva abaixo                                             |
| G14        | RLS, policies e grants equivalentes                                | fingerprint de equivalência                                       |
| G15        | credencial segura                                                  | segredo atômico, `.pgpass` 0600, apagado no fim do job            |

### G3 e G4 medidos: staging tem SETE migrations aplicadas, não oito (R2.4B, 05/08/2026)

A comparação de equivalência rodou pela primeira vez contra staging
([run 31042845838](https://github.com/samuel3ssilva/vipreco/actions/runs/31042845838)) e o
resultado é **MATERIAL DRIFT — 2 de 310 objetos**. As duas diferenças são o mesmo fato:

| Objeto                            | Esperado (8 migrations)                     | Encontrado (staging)   |
| --------------------------------- | ------------------------------------------- | ---------------------- |
| `pa_normalize_text(input text)`    | `btrim(regexp_replace(lower(translate(…))))` | `lower(translate(…))`  |
| `COMMENT ON FUNCTION pa_normalize_text` | contrato único de normalização         | _(ausente)_            |

O corpo encontrado em staging é **exatamente** o bloco `ROLLBACK EXATO` escrito dentro de
`20260803000000_normalization_contract.sql`, e o `COMMENT` que aquela migration adiciona não
existe. Dois fatos independentes, a mesma conclusão: **essa migration nunca foi aplicada em
staging** — como, aliás, o cabeçalho dela sempre disse ("esta migration NAO foi aplicada em
nenhum ambiente").

Isto não é adulteração nem deriva manual. É o estado documentado. O que estava errado era a
premissa de "adotar as oito versões": staging está em **sete**.

**Consequência direta, e é ela que importa:** `products_exact_identity_idx`, criado por
R2-A, é um índice **funcional sobre `pa_normalize_text()`**. Aplicar R2-A agora construiria o
índice de identidade exata — o que sustenta o princípio inviolável nº 1 — com a normalização
**antiga**, a que não colapsa espaço em branco. `'500 g'` e `'500  g'` continuariam sendo dois
SKUs. E a correção posterior não seria simples: a migration de normalização faz `REINDEX`, e o
`REINDEX` **falha** se as colisões já existirem.

Ou seja: o gate não travou por formalidade. Ele impediu que a semântica errada fosse gravada
no índice que define o que é o mesmo produto.

Pendentes em staging são **três**, não duas:

1. `20260803000000_normalization_contract` — exige rodar `scripts/normalization-collisions.ts`
   antes, e **parar** se o relatório não vier vazio (unir ou excluir produto é decisão do
   Founder/PMO, nunca do CTO);
2. `20260803010000_product_identity_quantity` (R2-A);
3. `20260803020000_gtin_integrity` (R2-B).

A ordem não é negociável, e a primeira não estava no escopo autorizado desta missão.

### G14 medido, com um achado de segurança em anexo

Fora as duas diferenças acima, os 308 objetos restantes são **idênticos**: tabelas, colunas,
tipos, nullability, defaults, constraints, índices, predicados, triggers, RLS, policies e
grants. G14 passa.

Mas o caminho até esse `PASS` revelou algo que ninguém tinha medido. A primeira execução
acusou **84 diferenças de grant**, e o fingerprint cru mostrou por quê:

|            | `anon` | `authenticated` | `service_role` | `postgres` |
| ---------- | ------ | --------------- | -------------- | ---------- |
| staging    | 45     | 45              | 48             | 48         |
| efêmero    | 3      | 3               | 48             | 48         |

48 = 6 tabelas × 8 privilégios. A aritmética fecha sem sobra: staging tem **tudo** menos os
três `INSERT` que a Onda 3 revogou nas tabelas de submissão; o efêmero tinha só os três
`SELECT` que as migrations concedem. 45 − 3 = 42, × 2 papéis = 84.

A leitura correta é sobre o instrumento — as migrations nunca precisaram *conceder* acesso de
tabela a `anon`, porque a plataforma Supabase já concedia; elas só revogam. Corrigido em
`scripts/r2/equivalence/01-supabase-table-grants.sql`.

**O achado que sobra, e que é decisão do Founder/PMO:**

`anon` detém `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` sobre `markets`, `products` e `prices`
em staging — e, pelo mesmo mecanismo de plataforma, quase certamente em produção também.

- **O que segura hoje:** RLS está ligada nas seis tabelas e as únicas policies para
  `anon`/`authenticated` em `markets`/`products`/`prices` são de `SELECT` (`cmd=r`). Sem
  policy de escrita, `INSERT`/`UPDATE`/`DELETE` são negados. Isso foi **medido**, não
  presumido.
- **Por que ainda assim importa:** a proteção inteira depende de uma camada só. A Onda 3
  estabeleceu defesa em profundidade para as tabelas de submissão — revogar o grant **e**
  confiar na RLS. Para `markets`/`products`/`prices` só a RLS trabalha.
- **`TRUNCATE` merece atenção separada:** no PostgreSQL, RLS **não se aplica** a `TRUNCATE` —
  ele é governado só pelo privilégio de tabela. `NOT VERIFIED`: não testei se o PostgREST
  consegue emitir `TRUNCATE` (ele não expõe verbo para isso, e `anon` é `NOLOGIN`), então
  hoje parece inalcançável pela superfície publicada. Inalcançável hoje não é o mesmo que
  impossível amanhã.
- **O teste que dá falsa segurança:** `scripts/db-drill/90-assertions.sql` afirma que `anon`
  não tem `INSERT` em tabela nenhuma. Contra um Postgres virgem, passa. Contra a plataforma
  real, é **falso** para `markets`, `products` e `prices`. O drill vinha passando pelo motivo
  errado — exatamente a classe de ponto cego do achado crítico da Onda 3, um nível acima:
  lá era `EXECUTE` em função, aqui é grant de tabela.

**Recomendação (não executada — §0 e a regra 14 do CLAUDE.md proíbem migration sem gate
humano):** uma migration que revogue `INSERT, UPDATE, DELETE, TRUNCATE` de `anon` e
`authenticated` nas três tabelas, mais a correção do baseline do drill para que a asserção
volte a medir a realidade. Isso é escopo próprio, fora de R2.

### G7 deixou de ser circular

Até R2.4, G7 dizia "`target-readiness` executado por inteiro". As consultas 5 a 7 daquele
arquivo referenciam `package_type`, `quantity_value` e `pa_is_valid_gtin` — objetos que a
migration **cria**. Antes de aplicar, o script parava em `42703`, o gate marcava `FAIL`, e o
`FAIL` bloqueava a aplicação.

Ou seja: G7 exigia, para autorizar a migration, uma prova que só a migration podia produzir.
Isso não é um ambiente reprovado — é um gate que não tem como passar. O `FAIL` do run
`31032153539` não media staging; media o gate.

A separação em `target-readiness-pre.sql` e `target-readiness-post.sql` desfaz a
circularidade na **estrutura**, e não num comentário pedindo tolerância:

> Antes de aplicar, o estado permitido é **`G7-PRE PASS` — `G7-POST PENDING BY DESIGN`**.
>
> `PENDING BY DESIGN` não é um `FAIL` educado: é a afirmação de que a pergunta ainda não pode
> ser feita. Confundir "ainda não dá para perguntar" com "a resposta foi não" é exatamente o
> que produziu a circularidade.

`scripts/r2/target-readiness.test.ts` reprova se qualquer identificador futuro voltar a
aparecer na parte PRE como referência — e continua exigindo que ele apareça como **literal de
texto** na consulta ao catálogo, que é legítima. Sem essa segunda metade, apagar a consulta 4
inteira faria o teste passar, e o gate perderia a verificação de que R2 ainda não foi aplicada.

### G5 e G13, e a linha de `product_watch_requests`

A auditoria de R2.3E achou **uma** linha em `product_watch_requests`, e ela reprovou G5 e G13.
Reprovar foi correto: a regra dizia "as três tabelas de submissão vazias", e uma não estava.

Mas "existe uma linha" é um número, não uma classificação. A partir de R2.4, essa linha **não
reprova G5/G13** quando classificada como `A. ANONYMOUS NONCRITICAL TELEMETRY` — e a
classificação se decide pela **estrutura** da tabela, não pelo conteúdo das linhas:

- nenhuma coluna capaz de guardar identificador de pessoa;
- nenhuma coluna de texto livre;
- nenhuma migration de R2 alcança a tabela;
- a linha é preservada: não é apagada, não é alterada, não é exportada.

Se não existe coluna capaz de guardar dado pessoal, nenhuma linha pode conter um — e afirmar
isso **não exige ler linha nenhuma**. É a única forma de responder "há dado pessoal aqui?" sem
que responder já seja uma leitura de dado pessoal.

A absolvição vale só para essa tabela. `price_submissions` e `decision_feedback` têm coluna de
texto livre e de escolha, e continuam contando integralmente. Dado com `is_demo = false`
também: nada aqui absolve dado real.

### STAGING DISPOSABLE REBUILD POLICY

**Staging não é sistema de registro.** O objetivo de recuperação é reconstruir schema,
reconstruir os dados de demonstração, recuperar a configuração necessária e preservar
contratos e evidências — **não** reter telemetria anônima não crítica.

G6-STAGING é `PASS` quando:

1. o schema é reconstruível a partir de `supabase/migrations/`;
2. o seed de demonstração é reconstruível a partir de `supabase/seed.sql`;
3. as migrations são reproduzíveis, e o rollback documentado foi executado;
4. as configurações necessárias estão documentadas;
5. nenhum dado pessoal ou crítico existe no ambiente;
6. o drill reconstrói tudo desde zero, com contagens exatas;
7. a única divergência aceita é telemetria anônima não crítica.

Os itens 1, 2, 3 e 6 são provados pelo `db-schema-drill`, que roda em CI e é required check.
O item 5 é provado pela classificação acima. O item 7 é a decisão que o Founder tomou, e ela
tem limite explícito:

> Isto **não** é política de backup de produção, **não** encerra o passo geral de backup,
> **não** autoriza perda de dado de piloto, **não** autoriza perda de dado pessoal e **não**
> autoriza tratar produção como descartável.

---

## Quem autoriza o quê

| Ato                       | Quem decide                                           | Quem executa              |
| ------------------------- | ----------------------------------------------------- | ------------------------- |
| escrever migration        | CTO                                                   | CTO                       |
| mergear na `main`         | CTO, com CI verde                                     | CTO                       |
| **aplicar em staging**    | **Founder/PMO**                                       | quem o Founder/PMO nomear |
| **aplicar em produção**   | **Founder/PMO**, em decisão separada da de staging    | idem                      |
| aprovar linha de backfill | **Founder/PMO**                                       | idem                      |
| `VALIDATE CONSTRAINT`     | **Founder/PMO**                                       | idem                      |
| tornar campos `NOT NULL`  | **Founder/PMO**, com migration própria e gate próprio | idem                      |

Autorização para staging **não** se estende a produção. São dois atos, com dois registros.

---

## Condições para abrir o gate

Todas precisam estar satisfeitas. Qualquer uma em aberto mantém o gate fechado.

1. [ ] FASE 0 do runbook integralmente cumprida, com backup verificado
2. [ ] FASE 1 executada, e a saída arquivada como evidência
3. [ ] **consulta 2 (GTIN inválido) devolveu vazio** — ou, se não devolveu, a curadoria já
       foi feita e registrada, e a consulta foi rodada de novo
4. [ ] preview de backfill executado e revisado linha a linha (FASE 2)
5. [ ] ambiente alvo nomeado explicitamente, um só
6. [ ] executor com credencial de `service_role` — sem isso a FASE 5 não escreve
7. [ ] rollback lido, e o ponto sem volta (FASE 5) compreendido
8. [ ] staging aplicado e observado antes de qualquer passo em produção

---

## O que este gate NÃO autoriza, em nenhuma hipótese

- aplicar as duas migrations num único passo sem verificar a primeira
- backfill antes da revisão humana linha a linha
- promover `parsed` a `confirmed` automaticamente
- `VALIDATE CONSTRAINT` antes do backfill completo
- `NOT NULL` antes de cobertura suficiente
- corrigir, completar ou inventar GTIN — **o ViPreço nunca gera um código**
- afrouxar constraint para o `VALIDATE` passar
- alterar RLS, policy ou grant de tabela: R2 não toca em nenhum dos três
- deploy do Worker: R2 não tem superfície de interface
- cadastrar dado real

---

## Se algo falhar

| Sintoma                                           | Leitura                                                 | Ação                                                         |
| ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `VALIDATE CONSTRAINT` falha                       | há linha antiga que viola a regra                       | olhar a linha; **não** afrouxar a constraint                 |
| `unique_violation` no backfill                    | duas linhas aprovadas produzem a mesma identidade exata | voltar à FASE 2 para aquelas duas; consulta 6 lista os casos |
| `permission denied for function pa_is_valid_gtin` | está escrevendo com papel sem `EXECUTE`                 | escrever como `service_role` (ver fato 1 do runbook)         |
| coluna nova já existe na FASE 3                   | a migration já foi aplicada antes                       | parar e reconciliar o estado real antes de seguir            |
| consulta 3 devolve GTIN duplicado                 | `products_gtin_unique_idx` não está neste ambiente      | é divergência de **schema**, não de dado — parar             |

Em todos os casos: registrar, não improvisar. Um passo que falhou e foi contornado no
improviso é pior do que um passo que falhou e parou.
