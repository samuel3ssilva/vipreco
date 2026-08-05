# Aplicação de R2 em staging — o gate e a decisão

**Resultado: nenhuma migration foi aplicada.** Nenhuma escrita foi emitida contra ambiente
algum. Este arquivo registra por quê, com o gate item a item.

Evidência que sustenta cada linha: [`preflight.md`](./preflight.md).

---

> **Superseded pela §1B (05/08/2026).** A tabela abaixo foi medida em 04/08 **pela chave
> anônima**, e três linhas dela eram sobre o limite da medição, não sobre o banco. Fica como
> está: apagá-la apagaria a diferença entre "não deu para olhar" e "olhou-se e o banco
> respondeu isto". O estado atual está em [§1B](#1b-gate-g1g15-medido-pelo-catálogo-05082026).

## 1. Gate consolidado G1–G15 (§10 do mandato) — medido pelo anônimo, 04/08

| #   | Condição                                            | Estado      | Base                                                                                                                                                |
| --- | --------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | staging identificado sem ambiguidade                | **PASS**    | preflight §1 — cinco fontes independentes concordam                                                                                                 |
| G2  | production identificada e comprovadamente diferente | **PASS**    | preflight §1 — refs e Workers distintos; banco de produção nunca contatado                                                                          |
| G3  | histórico remoto classificado como `ALIGNED`        | **FAIL**    | preflight §3 — estado **E. UNKNOWN**: o histórico é ilegível pelo anônimo                                                                           |
| G4  | schema anterior a R2 compatível                     | **UNKNOWN** | preflight §4 — colunas sem divergência; índices, constraints, funções, triggers, policies e grants `NOT VERIFIED`                                   |
| G5  | dados `DEMO ONLY` ou `EMPTY`                        | **UNKNOWN** | preflight §5 — tudo que é visível é demo; as linhas inativas não são enumeráveis sem `service_role`                                                 |
| G6  | backup e restauração verificados                    | **FAIL**    | preflight §9 — plano Free, **nenhum backup existe**                                                                                                 |
| G7  | `target-readiness` executado                        | **PARCIAL** | preflight §4 e §6 — consultas 1, 2 e 3 rodaram em equivalente pela Data API; a 4 só na parte de colunas; o `.sql` em si não rodou no editor do alvo |
| G8  | zero GTIN inválido ou duplicado                     | **FAIL**    | preflight §6 — **2 GTINs com dígito verificador errado**; 0 duplicados                                                                              |
| G9  | preview executado sem escrita                       | **PASS**    | preflight §7 — 7 linhas, exit 0, nenhuma escrita, determinístico                                                                                    |
| G10 | migrations e rollback verdes no schema drill        | **PASS**    | check `reconstruir schema e validar autorizacao` verde em `e203887`; rollback executável desde o PR #59                                             |
| G11 | CI e CodeQL verdes                                  | **PASS**    | `lint, test, build` e `Analyze (javascript-typescript)` verdes em `e203887`; 0 alertas Dependabot, 0 CodeQL                                         |
| G12 | nenhum deploy automático                            | **PASS**    | nenhum deployment novo; staging segue em `862a179`, produção em `b88e514`                                                                           |
| G13 | nenhum dado real                                    | **PASS**    | nenhum dado real foi cadastrado, e nenhum foi observado — com o mesmo limite de medição de G5                                                       |
| G14 | nenhuma alteração de RLS                            | **PASS**    | nada foi alterado em ambiente algum                                                                                                                 |
| G15 | credencial de staging segura e inequívoca           | **FAIL**    | preflight §2 — **não existe credencial de escrita**: sem `service_role`, sem senha de banco, sem access token, sem CLI                              |

---

## 1B. Gate G1–G15 medido pelo catálogo (05/08/2026)

**A primeira auditoria remota que de fato leu staging.**
[Run 31032153539](https://github.com/samuel3ssilva/vipreco/actions/runs/31032153539), `main` em
`6043e02`, PostgreSQL **17.6**, transação read-only confirmada pelo próprio banco.

O que mudou em relação a 04/08 não é o banco — é o instrumento. A chave anônima não enxerga
catálogo; a credencial do preflight enxerga. **Não sobrou nenhum `UNKNOWN`.**

| #   | Condição                                     | Estado   | Base                                                                                                                             |
| --- | -------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| G1  | staging identificado sem ambiguidade         | **PASS** | ref `…hhvigy` confirmado no usuário do pooler; host publicado só como hash `a757d67ece4e`                                        |
| G2  | production identificada e diferente          | **PASS** | ref de produção recusado por construção; banco de produção nunca contatado                                                       |
| G3  | histórico remoto `ALIGNED`                   | **FAIL** | **B. HISTORY MISSING** — `supabase_migrations.schema_migrations` **não existe**; 0 versões aplicadas contra 10 no repositório    |
| G4  | schema anterior a R2 compatível              | **PASS** | 53 colunas, 20 constraints, 18 índices, 4 funções, 6 policies, RLS em 6 tabelas; **nenhuma** das quatro colunas de R2-A presente |
| G5  | dados `DEMO ONLY` ou `EMPTY`                 | **FAIL** | **MIXED OR UNKNOWN** — `product_watch_requests` tem **1 linha**                                                                  |
| G6  | backup e restauração verificados             | **FAIL** | plano Free, sem backup nativo; metade versionada provada em [`recovery.md`](./recovery.md)                                       |
| G7  | `target-readiness` executado no ambiente     | **FAIL** | interrompeu numa coluna inexistente — **esperado antes de R2-A**; ver a ressalva abaixo                                          |
| G8  | zero GTIN inválido ou duplicado              | **FAIL** | preenchidos 7, **inválidos 2**, duplicados 0 — os mesmos `…0002` e `…0007`                                                       |
| G9  | preview executado sem escrita                | **PASS** | 7 linhas, todas `proposta_segura`; nenhuma escrita, dump apagado                                                                 |
| G10 | migrations e rollback verdes no schema drill | **PASS** | `reconstruir schema e validar autorizacao` verde em `6043e02`                                                                    |
| G11 | CI e CodeQL verdes                           | **PASS** | verdes em `6043e02`; 0 alertas de code scanning                                                                                  |
| G12 | nenhum deploy automático                     | **PASS** | staging segue em `862a179`, produção em `b88e514`                                                                                |
| G13 | nenhum dado real                             | **FAIL** | a mesma 1 linha de G5 — ver a ressalva abaixo                                                                                    |
| G14 | nenhuma alteração de RLS                     | **PASS** | transação `READ ONLY` confirmada **pelo banco** (`transaction_read_only = on`), `ROLLBACK` ao final                              |
| G15 | credencial de staging segura e inequívoca    | **PASS** | segredo atômico autenticou; nunca em argv, log ou ambiente após o `.pgpass` 0600                                                 |

**9 PASS, 6 FAIL, 0 UNKNOWN.** A recomendação do próprio relatório:
_"Nenhuma migration deve ser aplicada."_

### Contagens medidas

| Tabela                   | Total | Demo | Real | Ativas |
| ------------------------ | ----- | ---- | ---- | ------ |
| `markets`                | 4     | 4    | 0    | 4      |
| `products`               | 7     | 7    | 0    | 7      |
| `prices`                 | 22    | 22   | 0    | 21     |
| `price_submissions`      | 0     | —    | —    | —      |
| `product_watch_requests` | **1** | —    | —    | —      |
| `decision_feedback`      | 0     | —    | —    | —      |

As três primeiras batem **exatamente** com o seed versionado — o mesmo 4/7/22 que
`96-seed-rebuild.sql` confere no drill. Isso fecha, por medição, a linha 1 da matriz de
[`recovery.md`](./recovery.md) para essas tabelas.

### Três achados que exigem leitura, e não só registro

**1. O histórico de migrations não existe em staging.** Não é que esteja desalinhado: a
tabela `supabase_migrations.schema_migrations` não está lá. O schema existe — 53 colunas,
policies, funções —, mas nada registra como ele chegou. É coerente com aplicação por editor
SQL nas Ondas 2 e 3, fora da CLI.

Isso **não autoriza** `migration repair` nem marcação manual de versão. Carimbar 10 versões
como aplicadas transformaria uma incerteza conhecida numa certeza falsa — e a próxima pessoa
leria "alinhado" onde ninguém verificou nada.

**2. `product_watch_requests` tem 1 linha, e o `INSERT` público foi revogado na Onda 3.** A
tabela é instrumentação anônima, então uma linha ali não é, por si, dado pessoal. Mas a
classificação não tem como saber disso, e o certo é ela ser conservadora: G5 e G13 reprovam.

O que **não** dá para afirmar daqui: quando a linha entrou, nem por quê. A revogação é de
29/07 e o ambiente foi semeado em 27/07 — uma linha anterior à revogação explicaria tudo sem
nenhuma falha de controle. Explicaria; não prova. Ler a linha é escrita nenhuma, mas é uma
consulta que este preflight não faz de propósito (§6: nenhuma linha de tabela é publicada).

**3. G7 é insatisfazível antes de R2-A, e isso é um defeito do gate, não do ambiente.** As
consultas 5 a 7 de `target-readiness.sql` referenciam colunas que só existem **depois** de
R2-A. O gate pede que o script rode inteiro no ambiente alvo para autorizar aplicar R2-A.
Circular: ele só passa depois do que ele deveria autorizar.

Registrado, e não resolvido por conta própria — redefinir critério de gate é decisão do
Founder/PMO. A saída natural seria G7 exigir só as consultas 1–4 antes da aplicação, e as 5–7
como verificação **pós**-aplicação.

### O que continua valendo

Nenhuma migration aplicada. Nenhuma escrita emitida. Nenhum backfill. Nenhum GTIN corrigido.
Nenhum deploy. Nenhuma RLS ou DNS alterada. Banco de produção não contatado.

**4 FAIL, 3 UNKNOWN.** O §10 é explícito: só com G1–G15 todos em `PASS` a aplicação está
autorizada. Ela não está.

---

## 2. Qual é a causa raiz

As quatro reprovações não são independentes. Três delas **decorrem** da mesma ausência:

- **G15** é a ausência em si: nenhuma credencial capaz de escrever, ou sequer de ler o
  catálogo do sistema, existe neste ambiente;
- **G3** reprova porque o histórico de migrations mora no catálogo do sistema — para lê-lo é
  preciso exatamente a credencial que falta;
- **G4** e **G5** ficam `UNKNOWN` pelo mesmo motivo: índices, constraints, funções, policies,
  grants e linhas inativas são todos invisíveis ao anônimo;
- **G8** é o único achado que é sobre o **banco**, e não sobre a medição — e a correção dele
  também exige a credencial que falta.

**G6** é o único item independente: o plano Free não tem backup, e isso é anterior a R2.

Por isso o veredito primário é **CREDENTIAL ACCESS REQUIRED**. Resolver o acesso não faz os
outros gates passarem automaticamente — mas sem ele nenhum deles pode sequer ser reavaliado.

---

## 3. O achado que sobrevive à falta de credencial

Dois produtos fictícios em staging carregam GTIN com dígito verificador inválido:
`22222222-…-000000000002` e `22222222-…-000000000007` (Café Pilão 500 g e 250 g).

O `supabase/seed.sql` da `main` já tem os dois como `NULL` desde o commit `1102967`
(PR #53, 2026-08-03). **Staging é que está velho:** foi semeado em 2026-07-27 e nunca
re-semeado. O repositório está certo.

Isto **não** é curadoria de GTIN. Não há código a inventar, corrigir ou pesquisar: o valor
correto para essas duas linhas já foi decidido, está versionado, e é a ausência de código.

Consequência prática, e a distinção que não pode ser perdida:

| Passo                         | O que aconteceria hoje                                                      |
| ----------------------------- | --------------------------------------------------------------------------- |
| aplicar R2-B                  | **passaria** — a constraint nasce `NOT VALID` e não confere linha existente |
| FASE 6, `VALIDATE CONSTRAINT` | **falharia** nessas duas linhas                                             |

O Gate G8 bloqueia por causa da segunda linha da tabela, e faz isso no momento certo: um
relatório agora custa menos do que a mesma descoberta no meio de uma janela de manutenção.

---

## 4. O que **não** foi feito, e não deve ser lido como pendência esquecida

- não foi executado `supabase db push`, `migration up`, `db reset` nem `migration repair`;
- nenhuma versão foi marcada artificialmente como aplicada no histórico;
- nenhuma linha foi corrigida, apagada, unida ou reescrita — inclusive as duas do §3;
- nenhum backfill, nenhum `VALIDATE CONSTRAINT`, nenhum `NOT NULL`;
- nenhuma RLS, policy ou grant tocada;
- nenhum deploy, nenhum DNS, nenhuma mudança de Worker, de interface ou de ranking;
- nenhum dado real cadastrado;
- PR #44 e os seis PRs do Dependabot não foram tocados;
- **o banco de produção não foi contatado.**

---

## 5. Ações humanas, na ordem em que resolvem

1. **Decidir o acesso de staging.** Sem isso nada avança. As opções, em ordem de menor
   privilégio: (a) o Founder roda `scripts/r2/target-readiness.sql` no editor SQL do painel e
   arquiva a saída; (b) instalar e autenticar a CLI `supabase` num ambiente do Founder;
   (c) cadastrar credencial de banco de staging num cofre — **nunca** em `.env` versionado,
   nunca em `VITE_*`, nunca no chat.
2. **Realinhar o seed de staging** com o `supabase/seed.sql` da `main`, o que resolve G8. É
   escrita, exige `service_role`, e é decisão do Founder. Duas formas:
   - re-semear staging a partir do arquivo versionado (mais limpo, e alinha tudo de uma vez);
   - ou anular o `gtin` das duas linhas nomeadas no §3 — e **só** dessas duas.
     Depois, rodar a consulta 2 de novo e conferir que voltou vazia.
3. **Reavaliar G3, G4 e G5** com a credencial obtida: histórico de migrations, catálogo de
   índices/constraints/funções/policies/grants, e contagem das linhas inativas.
4. **Decidir sobre backup (G6)** — é decisão de custo, não técnica, e a nota completa está em
   `docs/operations/RESILIENCE-RUNBOOK.md` §6. Enquanto o banco só tiver dado fictício, o
   risco segue aceito, como já registrado; no dia em que houver dado de piloto, deixa de ser.
5. Só então voltar às FASES 0–4 do `R2-ROLLOUT-RUNBOOK.md`, **parando antes da FASE 5**.

---

## 6. Veredito

**CREDENTIAL ACCESS REQUIRED**, com três bloqueios concorrentes que não desaparecem quando o
acesso for resolvido:

- `STAGING BASELINE RECONCILIATION REQUIRED` — G3, histórico em estado `E. UNKNOWN`;
- `BACKUP RESTORE BLOCKER` — G6, plano Free sem backup;
- G8, os dois GTINs inválidos — sem sigla própria no §20 do mandato, mas bloqueia R2-B.

E, em frente separada, `BRANCH PROTECTION HUMAN ACTION REQUIRED` — ver
[`../branch-protection.md`](../branch-protection.md).
