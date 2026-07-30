# Proposta de arquitetura segura — fluxos de escrita do piloto Artemis (Onda 5 / Gate R0)

> **AVISO — ISTO É UMA PROPOSTA, NÃO UMA IMPLEMENTAÇÃO.**
>
> Nenhuma migration deste documento existe em `supabase/migrations/`. Nenhum código de
> aplicação foi criado ou alterado para viabilizar o que está descrito aqui. Todo DDL, nome
> de tabela, nome de função e trecho de SQL abaixo é **esboço ilustrativo** para tornar a
> proposta concreta e revisável — não é schema aplicado, nem em staging, nem em produção.
>
> Qualquer migration real que implemente algo deste documento é uma **tarefa de engenharia
> separada**, com sua própria revisão adversarial, seu próprio checkpoint humano e sua
> própria verificação ao vivo (mesmo padrão de `docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`),
> só depois que esta proposta for aprovada pelo PMO/Founder como parte do Gate R0
> (`PLANO-MESTRE.md` §10).
>
> Este documento não autoriza a Onda 5, o piloto, coleta de dado real ou qualquer dado de
> participante. Nenhum exemplo abaixo usa CPF, CNPJ, nome de mercado ou chave fiscal reais —
> todos os valores são fictícios e óbvios, seguindo a mesma regra de `supabase/seed.sql`.

## 0. Escopo e como ler este documento

Mandato: `docs/governance/` (mandato da Onda 5 ainda não registrado formalmente — este
documento é preparação de Gate R0 sob `PLANO-MESTRE.md` §1 "Autonomia do CTO" e §17.5, que
autoriza o CTO a **propor** arquitetura segura sem mergeá-la e sem que isso constitua
autorização da Onda 5).

Este documento cobre os fluxos de escrita que o piloto Artemis exigirá e que **hoje não
existem no schema**: ingestão de NFC-e via canal concierge, reconciliação de cashback/Pix,
cadastro de comerciante/estabelecimento, publicação de Achados a partir do WhatsApp, e a
reativação eventual da moderação de `price_submissions`. Não cobre:

- desenho de UI/UX do canal concierge ou do painel interno (fora do escopo de banco);
- inventário de dados, base legal e texto de consentimento — ver
  `docs/r0/PRIVACY-AND-CONSENT-REQUIREMENTS.md` (preparado em paralelo, referenciado aqui,
  não visível neste worktree);
- política de retenção, prazos e descarte por tipo de dado — ver
  `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md` (idem);
- integração concreta com a instituição parceira de Pix, contrato comercial ou tarifação —
  decisão de produto/jurídico fora do escopo técnico deste documento;
- o spike de 50 cupons em si (`PLANO-MESTRE.md` §10 "Estratégia do spike") — este documento
  propõe a arquitetura que o spike usaria, não o plano de execução do spike.

### Padrão herdado, não reinventado

Toda a proposta reaproveita o padrão já estabelecido e documentado em
`docs/security/DATABASE-AUTHORIZATION-MATRIX.md` e `docs/security/THREAT-MODEL-ONDA-3.md`:

1. **RLS habilitado em toda tabela nova**, sem exceção — nenhuma tabela exposta pela Data API
   fica sem `ENABLE ROW LEVEL SECURITY`.
2. **Grants explícitos por role**, nunca implícitos. A lição mais cara da Onda 3 (§5.3 do
   threat model) foi que o Supabase concede `EXECUTE` a `anon`/`authenticated`/`service_role`
   em toda função nova via `ALTER DEFAULT PRIVILEGES` de plataforma, **fora do controle de
   versionamento deste repositório**, e que `REVOKE ALL ... FROM PUBLIC` sozinho não desfaz
   esse grant direto. Toda função `SECURITY DEFINER` proposta abaixo **deve** nascer com
   `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated;` explícito, nomeando os três,
   e a verificação ao vivo pós-deploy (não apenas leitura estática da migration) é obrigatória
   antes de qualquer uso com dado real — exatamente o gap que permitiu, sem ser percebido por
   cinco revisões adversariais anteriores, que `anon` pudesse chamar `approve_submission`
   desde a Onda 1.
3. **`SECURITY DEFINER` para toda operação mediada** que precisa que um ator sem privilégio
   direto (concierge, pipeline automatizado) produza um efeito controlado (criar um preço,
   liberar um cashback) sem ganhar acesso amplo à tabela de destino — mesmo padrão de
   `approve_submission(uuid)`.
4. **`service_role` nunca no frontend**, nunca em `VITE_*`, nunca em log, nunca em commit —
   princípio #5 do `CLAUDE.md`, sem exceção para os fluxos novos.

Nenhuma tabela ou função proposta abaixo introduz um mecanismo de autorização novo (ex.: JWT
customizado, papel de banco adicional, extensão de auth). Onde a proposta se afasta do padrão
existente — a questão de "quem chama a função `SECURITY DEFINER`" quando não há mais
`service_role` de CI, mas sim um processo humano/operacional — a solução escolhida (§2) é
deliberadamente conservadora: reaproveitar `service_role` atrás de uma ferramenta interna,
não criar um novo papel de banco.

---

## 1. Caminho autorizado de escrita, por fluxo

Regra geral, sem exceção: **nenhum fluxo novo concede `INSERT`/`UPDATE`/`DELETE` direto a
`anon` ou `authenticated` em nenhuma tabela sensível.** Toda escrita passa por (a) uma função
`SECURITY DEFINER` chamada a partir de um processo interno autenticado na borda, nunca do
navegador do participante, ou (b) `service_role` operado por um processo interno (pipeline de
ingestão, painel administrativo), também nunca exposto ao bundle do frontend.

| Fluxo                                            | Quem inicia                                            | Quem grava no banco                                                                               | Tabela(s) alvo                                                                     | Mecanismo                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Ingestão de NFC-e (concierge)                    | Participante (WhatsApp, fora do app)                   | Pipeline interno de ingestão (processo de backend, não navegador)                                 | `nfce_receipts`                                                                    | `service_role` direto, atrás de painel/processo interno — sem grant a `anon`/`authenticated`                           |
| Validação e cálculo de elegibilidade de cashback | Pipeline interno (automatizado)                        | Pipeline interno                                                                                  | `cashback_ledger` (status `pending_review`)                                        | Função `SECURITY DEFINER` `evaluate_cashback_eligibility(receipt_id)`, chamável só por `service_role`                  |
| Aprovação humana de pagamento                    | Operador humano (concierge/equipe), via painel interno | Painel interno, usando `service_role` da própria ferramenta                                       | `cashback_ledger` (→ `approved`), `cashback_approval_audit`                        | Função `SECURITY DEFINER` `approve_cashback(ledger_id, operator_identity, justification)`                              |
| Execução do Pix                                  | Processo interno, após aprovação                       | Processo interno (integração com instituição parceira)                                            | `cashback_ledger` (→ `pix_paid`/`pix_failed`)                                      | `service_role`, idempotente por `ledger_id` (ver §5)                                                                   |
| Cadastro/edição de comerciante                   | Equipe (onboarding manual)                             | Painel interno                                                                                    | `merchant_accounts`                                                                | `service_role` direto — tabela operacional confidencial, nunca lida por `anon`/`authenticated`                         |
| Achado enviado pelo lojista (WhatsApp)           | Comerciante (WhatsApp, fora do app)                    | Pipeline de ingestão grava rascunho pendente                                                      | `achado_submissions` (status `pending_review`)                                     | `service_role` direto — não é escrita pública, é o mesmo pipeline que já processa a foto/áudio                         |
| Publicação do Achado                             | Operador humano (revisão)                              | Painel interno                                                                                    | `prices` (via função), `achado_submissions` (→ `published`), `operation_audit_log` | Função `SECURITY DEFINER` `publish_achado(submission_id, operator_identity)`                                           |
| Reativação futura de `price_submissions`         | Visitante anônimo (comunidade)                         | Visitante grava `pending` diretamente (RLS reaberta), moderação continua via `approve_submission` | `price_submissions` → `prices`                                                     | **Fora do escopo de reabertura sem gate próprio** — ver §9.4; padrão já existe, só falta religar com proteção de borda |

Nenhuma linha da tabela acima concede `INSERT` a `anon`/`authenticated` em `nfce_receipts`,
`cashback_ledger`, `merchant_accounts`, `achado_submissions` ou `operation_audit_log`. Isso é
deliberado: diferente de `price_submissions` (que foi desenhada, historicamente, para receber
`INSERT` público direto), nenhum dos fluxos novos tem um participante digitando diretamente em
um formulário do app que grava no Supabase. Tudo entra pelo canal concierge (WhatsApp) ou por
um painel operado por pessoa da equipe — o que elimina a classe de risco descrita no achado
central da Onda 3 (escrita pública sem proteção server-side, `THREAT-MODEL-ONDA-3.md` item 2).

---

## 2. Segregação `anon` / `authenticated` / `service_role`

### Recomendação: o piloto não precisa de `authenticated`

`CLAUDE.md` princípio #9 proíbe login de consumidor, e o threat model da Onda 3 já registrou
que `authenticated` hoje é "equivalente a `anon` na prática" porque não existe fluxo de
login/signup ativo (§2 do threat model). Nada nos fluxos do piloto exige mudar isso:

- o participante nunca autentica no app para enviar NFC-e — envia por WhatsApp, canal fora do
  Supabase Auth por completo;
- o comerciante nunca autentica no app — envia Achado por WhatsApp;
- a única superfície onde "quem fez o quê" importa de verdade é o **operador interno**
  (concierge/equipe que aprova cashback e publica Achado) — e essa é uma fronteira diferente
  de "consumidor logado", tratada abaixo.

**Proposta: manter `authenticated` sem grants novos, exatamente como está hoje** (mesmos
GRANTs vazios de `anon`, papel presente no schema, não usado por nenhum fluxo). Reabrir
`authenticated` para login de consumidor está fora de escopo — violaria o princípio #9 e não é
necessário para nenhum dos fluxos deste documento.

### Como resolver a fronteira "operador interno" sem introduzir um novo papel de banco

O piloto tem uma pessoa fazendo a validação/aprovação (o Founder ou, no cenário que Artemis
testa, "um terceiro" — pergunta 3 de `PLANO-MESTRE.md` §4 "O que Artemis testa"). Essa pessoa
precisa de uma identidade rastreável para a auditoria (§6), mas **não deve ganhar uma credencial
de banco própria**: isso duplicaria a superfície de credenciais que a Onda 1C já reduziu (MFA,
rotação) e criaria uma nova classe de segredo para proteger.

Proposta, em ordem de preferência:

1. **Painel interno atrás de Cloudflare Access (Zero Trust)**, restrito a e-mails da equipe
   (allowlist, não signup público), reaproveitando a mesma conta Cloudflare já usada para o
   Worker (Onda 2). O painel roda como um processo de backend (Cloudflare Worker/Pages
   Function distinto do Worker público, ou rota server-only protegida) que guarda
   `service_role` como secret — nunca no bundle enviado ao navegador. Cloudflare Access injeta
   o e-mail autenticado do operador em um header verificável
   (`Cf-Access-Authenticated-User-Email`); o painel repassa esse valor como parâmetro
   `operator_identity` para as funções `SECURITY DEFINER` (§6). Isso não é "login de
   consumidor" — é controle de acesso de borda para uma ferramenta interna, mesma categoria de
   controle que já protege os GitHub Environments (Onda 1C/2).
2. **Alternativa mais simples para o volume do piloto (20–25 domicílios)**: nenhum painel novo;
   a pessoa da equipe roda um script interno (mesmo padrão dos scripts de `scripts/` já
   existentes, como `check-uptime.ts`), autenticado por posse do secret `service_role` em
   ambiente controlado (máquina da equipe ou GitHub Actions com `workflow_dispatch` manual e
   `environment: production` com required reviewer — reaproveitando o Environment já
   configurado desde a Onda 2). `operator_identity` vem do ator do GitHub Actions
   (`github.actor`) ou é digitado como parâmetro obrigatório do script.

Ambas as alternativas evitam criar um papel `staff`/`operator` no Postgres: `service_role`
continua sendo o único papel com privilégio de escrita real, e a identidade do operador humano
vira **dado de auditoria** (parâmetro de função, coluna de tabela), não um mecanismo de
autorização do banco. Qual das duas alternativas o piloto usa é decisão de implementação, não
deste documento — mas qualquer que seja a escolhida, a regra é a mesma: `service_role` nunca
sai do processo de backend/CI, nunca chega ao navegador do participante ou do comerciante.

### Tabela resumo

| Papel           | Uso no piloto                                                                                                                                                                                                                                     | Muda em relação a hoje?                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `anon`          | Leitura pública do catálogo (`markets`/`products`/`prices`), igual hoje. Zero escrita nos fluxos novos.                                                                                                                                           | Não                                             |
| `authenticated` | Sem uso — nenhum fluxo do piloto autentica consumidor.                                                                                                                                                                                            | Não                                             |
| `service_role`  | Único papel com escrita em `nfce_receipts`, `cashback_ledger`, `merchant_accounts`, `achado_submissions`, `operation_audit_log`. Operado por processo interno (painel atrás de Cloudflare Access, ou script/Actions manual), nunca pelo frontend. | Uso ampliado (mais tabelas), mecanismo idêntico |

---

## 3. Validação server-side

Princípio: **nenhum valor declarado pelo cliente (participante ou comerciante) é confiável até
ser revalidado no servidor.** O canal concierge (WhatsApp) já impõe isso estruturalmente — não
há formulário de app que aceite input direto — mas o pipeline que processa a mensagem do
WhatsApp precisa repetir toda validação antes de persistir.

| Dado                              | Onde é declarado                                                                                                                    | Validação server-side obrigatória                                                                                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chave de acesso da NFC-e          | Foto/áudio/XML enviado pelo participante                                                                                            | Formato (44 dígitos, dígito verificador da chave), consulta ativa à SEFAZ-SP (não confiar em texto digitado), status "autorizada" (não cancelada/denegada) no momento da consulta                                                        |
| CNPJ do emitente                  | Extraído da NFC-e consultada, não digitado pelo participante                                                                        | Dígito verificador de CNPJ, comparado contra `merchant_accounts.cnpj` da lista de comerciantes elegíveis da campanha — nota de mercado fora da lista não gera cashback                                                                   |
| Valor da compra / itens elegíveis | Extraído da NFC-e consultada                                                                                                        | Nunca aceitar valor "informado" por participante; usar somente o valor retornado pela consulta oficial. Itens elegíveis cruzados contra o catálogo canônico (`products`), mesma regra de identidade exata do princípio #1 do `CLAUDE.md` |
| Elegibilidade do domicílio        | Cadastro do participante no protocolo do piloto (fora do escopo deste documento, ver `docs/r0/PRIVACY-AND-CONSENT-REQUIREMENTS.md`) | Limite semanal, intervalo mínimo entre cupons e teto total por participante recalculados no servidor a cada tentativa, nunca assumidos do último cálculo (ver §7)                                                                        |
| Justificativa de aprovação        | Digitada pelo operador no painel interno                                                                                            | Campo obrigatório não vazio (`CHECK (length(trim(justification)) > 0)`), sem sanitização adicional necessária (texto livre auditado, nunca renderizado como HTML)                                                                        |

Toda validação acima roda **antes** do `INSERT`/`UPDATE`, dentro do processo interno (pipeline
ou função `SECURITY DEFINER`), nunca delegada ao cliente que originou o dado. Onde a validação
depende de uma consulta externa (SEFAZ), o resultado da consulta — não a alegação do
participante — é o que se persiste.

---

## 4. Rate limiting

O threat model da Onda 3 já deixou registrado um limite estrutural importante (§2): **o Worker
Cloudflare não fica no caminho das chamadas do navegador ao Supabase** — o cliente Supabase
fala direto com `SUPABASE_URL`. Qualquer rate limit implementado só no Worker (headers, CSP,
Cloudflare Rate Limiting em `/buscar`, etc.) protege as rotas do app, não a Data API. A Onda 3
tratou isso corretamente para os fluxos que existiam: fechando o `INSERT` público em vez de
tentar proteger com rate limit no Worker (`THREAT-MODEL-ONDA-3.md` §4.2: "criar Turnstile ou um
rate limiter agora seria proteger uma superfície que não existe").

Para os fluxos deste documento, essa limitação **não se aplica da mesma forma**, porque nenhum
deles expõe um endpoint de escrita direto a `anon`/`authenticated`. Rate limiting relevante aqui
tem três camadas diferentes:

1. **Canal de entrada (WhatsApp Business API)** — o limite natural já vem da própria API do
   WhatsApp Business (limites de mensagens por número, por janela). Nenhum controle adicional é
   necessário no MVP: o volume esperado (20–25 domicílios, `PLANO-MESTRE.md` G2) está muito
   abaixo de qualquer limite de plataforma.
2. **Pipeline de ingestão → consulta SEFAZ** — a consulta externa de NFC-e é o recurso mais caro
   e mais sujeito a throttling/captcha (`PLANO-MESTRE.md` §4.3: "estabilidade, presença de
   captcha, limites... continuam NOT VERIFIED até o spike"). Proposta: fila com processamento
   em lote controlado (mesmo espírito do "spike em lotes com stop/go" de `PLANO-MESTRE.md` §10),
   não uma consulta síncrona por mensagem recebida — decisão de implementação a validar no
   próprio spike, não neste documento.
3. **Se, no futuro, qualquer um destes fluxos ganhar um endpoint público direto** (por exemplo,
   upload de foto de cupom pelo próprio app em vez de WhatsApp — hoje fora de escopo,
   `PLANO-MESTRE.md` §5 "Não entra: Scanner de QR no app"), essa mudança **exige, na mesma
   migration/PR que abre o endpoint**, a mesma combinação já exigida para reabrir
   `price_submissions` em `THREAT-MODEL-ONDA-3.md` §4.2: validação server-side, proteção
   anti-abuso (Turnstile ou equivalente — avaliada mas não implementada na Onda 3, porque
   nenhuma superfície pública de escrita estava aberta), Cloudflare Rate Limiting na rota do
   Worker que efetivamente medeia a chamada (não a Data API direta), testes de bypass e novo
   gate do PMO/Founder. Nenhuma reabertura parcial é aceitável — mesma regra herdada.

Resumo: como nenhum fluxo novo tem `INSERT` público, rate limiting de borda (Turnstile,
Cloudflare Rate Limiting) **não é um bloqueio deste documento** — é um requisito que só se
ativa se uma decisão de produto futura reintroduzir um formulário público, e nesse caso o
padrão a seguir já está definido em `docs/security/THREAT-MODEL-ONDA-3.md` §4.2.

---

## 5. Idempotência

Requisito de `CLAUDE.md` §9 "Deduplicação fiscal e retenção": impedir que a mesma chave fiscal
gere benefício mais de uma vez em toda a plataforma, sem reter a chave bruta indefinidamente.

### Desenho proposto

1. **Deduplicação por HMAC, não pela chave bruta.** `nfce_receipts` armazena
   `fiscal_key_hash bytea NOT NULL` = `HMAC-SHA256(chave_de_acesso, pepper)`, com
   `pepper` um segredo dedicado (não o `service_role`, não a chave publishable, não reutilizado
   de nenhum outro propósito), cadastrado como secret de ambiente e sujeito ao mesmo processo de
   rotação da Onda 1C. `UNIQUE (fiscal_key_hash)` na tabela — a própria constraint de banco
   rejeita uma segunda chave fiscal idêntica, sem depender de lógica de aplicação para acertar
   isso.
2. **A chave bruta só existe durante a janela operacional** (consulta, validação, verificação de
   cancelamento — `CLAUDE.md` §9 item 1). Proposta de desenho: a chave bruta nunca é escrita em
   `nfce_receipts` (que só tem o hash); ela vive em um passo transitório do pipeline (fila/
   processamento em memória ou tabela de staging de curta duração, com TTL, fora do escopo de
   nome definitivo deste documento — a decisão de retenção exata é de
   `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md`). Depois que a janela de cancelamento fecha (§7) e o
   ledger é decidido, a chave bruta é descartada; só o hash permanece, para sempre poder provar
   "essa chave já foi usada" sem conseguir reconstruir a chave a partir do hash (HMAC com pepper
   secreto não é reversível sem o pepper).
3. **Idempotência do lado do Pix.** `cashback_ledger.id` (UUID gerado no momento em que o
   registro é criado, antes de qualquer chamada à instituição parceira) é usado como chave de
   idempotência na chamada externa de pagamento — qualquer parceiro de Pix com suporte a
   idempotency key recebe o mesmo `ledger_id` em caso de retry, garantindo que uma falha de rede
   após o pagamento ter sido efetivado do lado do parceiro não gere um segundo Pix quando o
   processo interno tenta de novo (ver §11).
4. **Nunca logar a chave bruta.** Nenhum log, mensagem de erro ou linha de auditoria deste
   desenho grava a chave de acesso da NFC-e em texto puro — só o hash e, quando necessário para
   suporte humano, os últimos 4 dígitos (suficiente para o operador confirmar "é essa nota" sem
   reconstituir a chave completa).

### Esboço ilustrativo

```sql
-- ESBOÇO — não aplicado. Nomes e tipos sujeitos a revisão na migration real.
CREATE TABLE public.nfce_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_key_hash bytea NOT NULL,        -- HMAC-SHA256(chave_de_acesso, pepper) — nunca a chave bruta
  merchant_id uuid REFERENCES public.merchant_accounts(id),
  household_ref text NOT NULL,           -- identificador pseudonimizado do domicílio, não CPF
  purchase_total numeric NOT NULL CHECK (purchase_total > 0),
  purchase_observed_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received', 'parsing', 'parse_failed',
      'validating', 'eligible', 'ineligible', 'duplicate'
    )),
  parse_error text,                      -- preenchido só quando status = 'parse_failed'
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false -- mesmo padrão de markets/products/prices
);

CREATE UNIQUE INDEX nfce_receipts_fiscal_key_hash_key
  ON public.nfce_receipts (fiscal_key_hash);

ALTER TABLE public.nfce_receipts ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy de SELECT/INSERT para anon/authenticated é criada.
-- Sem GRANT correspondente, a ausência de policy já bloqueia por padrão (fail-closed),
-- mas o padrão desta Onda é ser explícito mesmo assim (ver DATABASE-AUTHORIZATION-MATRIX.md).
REVOKE ALL ON public.nfce_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.nfce_receipts TO service_role;
```

---

## 6. Auditoria

Padrão de referência: `approve_submission(uuid)` já prova (e o achado de escalação de
privilégio da Onda 3, `THREAT-MODEL-ONDA-3.md` §5.3, prova o custo de fazer isso errado) que
uma função `SECURITY DEFINER` mal restrita é indistinguível, do ponto de vista de quem chama,
de uma escrita direta. Para os fluxos deste documento — que envolvem dinheiro, não apenas
conteúdo — a auditoria precisa ser **mais rica** que `approve_submission`: não basta saber
"aprovado, quando"; é preciso saber **quem** aprovou e **por quê**.

### Tabela de auditoria proposta

```sql
-- ESBOÇO — não aplicado.
CREATE TABLE public.operation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,             -- ex.: 'cashback_ledger', 'achado_submission'
  entity_id uuid NOT NULL,
  action text NOT NULL,                  -- ex.: 'approved', 'rejected', 'published', 'reversed'
  operator_identity text NOT NULL,       -- e-mail/identificador do operador humano, nunca vazio
  justification text NOT NULL CHECK (length(trim(justification)) > 0),
  previous_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operation_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operation_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.operation_audit_log TO service_role;
-- Sem UPDATE/DELETE para nenhum papel, inclusive service_role, via GRANT — trilha de auditoria
-- é apenas-anexa (append-only) por desenho; correção de um registro errado é um novo registro
-- que referencia o anterior, nunca uma edição in-place.
```

Toda função `SECURITY DEFINER` de aprovação (`approve_cashback`, `publish_achado`,
`reverse_cashback`) grava uma linha em `operation_audit_log` **na mesma transação** da mudança
de estado — igual ao padrão de `submission.status = 'approved'` dentro de `approve_submission`,
só que em uma tabela dedicada em vez de uma coluna da própria tabela de origem, porque aqui
precisamos manter histórico de múltiplas ações sobre a mesma entidade (aprovação, e
eventualmente reversão) sem perder a primeira quando a segunda acontece.

### Esboço de função

```sql
-- ESBOÇO — não aplicado.
CREATE OR REPLACE FUNCTION public.approve_cashback(
  p_ledger_id uuid,
  p_operator_identity text,
  p_justification text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry public.cashback_ledger;
BEGIN
  IF p_operator_identity IS NULL OR length(trim(p_operator_identity)) = 0 THEN
    RAISE EXCEPTION 'operator_identity obrigatorio';
  END IF;
  IF p_justification IS NULL OR length(trim(p_justification)) = 0 THEN
    RAISE EXCEPTION 'justification obrigatoria';
  END IF;

  SELECT * INTO entry FROM public.cashback_ledger WHERE id = p_ledger_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lancamento % nao encontrado', p_ledger_id;
  END IF;
  IF entry.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Lancamento % nao esta pendente de revisao (status=%)', p_ledger_id, entry.status;
  END IF;

  UPDATE public.cashback_ledger
  SET status = 'approved', approved_at = now()
  WHERE id = p_ledger_id;

  INSERT INTO public.operation_audit_log (
    entity_type, entity_id, action, operator_identity, justification,
    previous_status, new_status
  ) VALUES (
    'cashback_ledger', p_ledger_id, 'approved', p_operator_identity, p_justification,
    'pending_review', 'approved'
  );

  RETURN p_ledger_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_cashback(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cashback(uuid, text, text) TO service_role;
```

Note que a assinatura exige `p_operator_identity` e `p_justification` como parâmetros
obrigatórios não vazios — a função falha fechado se o painel interno não os fornecer, o que
força a ferramenta que chama `service_role` a sempre capturar quem está aprovando e por quê,
em vez de deixar isso como um campo opcional que a UI pode esquecer de preencher.

---

## 7. Antifraude mínimo

Requisitos vêm de `PLANO-MESTRE.md` §9 "Cashback e fraude" e §7 "Orçamento de pesquisa e
elegibilidade": limites por pessoa/domicílio/dispositivo, detecção de duplicidade, janela de
verificação de cancelamento antes do pagamento.

| Controle                                                     | Onde vive                                                                                                        | Desenho                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Um registro por domicílio                                    | Cadastro do protocolo do piloto (fora deste documento) + `nfce_receipts.household_ref`                           | `household_ref` é um identificador pseudonimizado emitido no cadastro do participante — nunca CPF bruto (ver `docs/r0/PRIVACY-AND-CONSENT-REQUIREMENTS.md`)                                                                                                                                                    |
| Limite semanal / intervalo mínimo / teto total por domicílio | Função de validação, recalculada a cada tentativa (§3)                                                           | `evaluate_cashback_eligibility()` conta `cashback_ledger` do mesmo `household_ref` na janela corrente antes de criar um novo lançamento — nunca confia em contador de cliente                                                                                                                                  |
| Duplicidade de chave fiscal                                  | `nfce_receipts.fiscal_key_hash` (§5)                                                                             | `UNIQUE` na constraint de banco — rejeita na origem, não depende de checagem aplicacional                                                                                                                                                                                                                      |
| Duplicidade de item/loja/data                                | Fila de revisão do pipeline de ingestão (fora do escopo de schema)                                               | Sinalização para revisão humana quando o mesmo item aparece em notas muito próximas no tempo do mesmo domicílio — heurística operacional, não bloqueio automático no MVP                                                                                                                                       |
| Funcionário/equipe/lojista fora da coorte                    | Cadastro do protocolo do piloto                                                                                  | `merchant_accounts` e a lista de domicílios elegíveis do piloto são conjuntos disjuntos por construção — cruzamento validado no cadastro, não em tempo de aprovação                                                                                                                                            |
| Janela de verificação de cancelamento antes do pagamento     | `cashback_ledger.status = 'pending_payment'` como estado intermediário obrigatório entre `approved` e `pix_paid` | Nenhum Pix é disparado no mesmo instante da aprovação. Existe uma janela mínima (parâmetro de produto, não deste documento) em que o processo reconsulta a NFC-e para confirmar que não foi cancelada antes de mover para `pix_paid`                                                                           |
| Dispositivo                                                  | Não implementado no MVP                                                                                          | Fingerprint de dispositivo é uma camada mais pesada, com trade-off de privacidade; dado que o canal é WhatsApp (não um app com JS de coleta), não há superfície natural para isso hoje. Registrado como lacuna aceita para o piloto — reavaliar se o volume ou o padrão de abuso observado no spike justificar |

### Máquina de estados proposta para `cashback_ledger`

```
pending_review → approved → pending_payment → pix_paid
       ↓              ↓             ↓
   rejected      rejected      pix_failed → (retry controlado, ver §11)
```

Nenhuma transição pula um estado. `pix_paid` só é alcançável a partir de `pending_payment`
depois da reconfirmação de não-cancelamento, o que implementa diretamente a "janela de
verificação de cancelamento antes do pagamento" de `PLANO-MESTRE.md` §9.

---

## 8. Segregação staging/produção

Reaproveita integralmente o isolamento já provado nas Ondas 2 e 3, sem desenho novo:

1. **Toda migration nova destes fluxos nasce e é validada primeiro em staging**
   (`wjurqpclauwtbjhhvigy`), com dado 100% sintético — mesma convenção `is_demo = true` de
   `supabase/seed.sql`, estendida às tabelas novas (`nfce_receipts.is_demo`,
   `cashback_ledger.is_demo`, etc.). Nenhum dado de teste usa CNPJ, CPF ou chave fiscal reais —
   fixtures explicitamente fictícias (ex.: `chave_de_acesso` sintética que não corresponde a
   nenhuma nota real, `cnpj` no padrão de teste `00.000.000/0001-91` já reconhecido como
   inválido/fictício).
2. **`scripts/verify-env.ts`** (já existente, fail-closed desde a Onda 2) continua sendo o guard
   contra aplicar uma migration ou rodar um script contra o projeto Supabase errado — nenhuma
   mudança necessária nele para os fluxos novos, ele já opera no nível de "qual projeto estou
   tocando", agnóstico de quais tabelas existem.
3. **Produção só recebe cada migration depois da verificação ao vivo em staging**, seguindo o
   mesmo runbook de `docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`: aplicar, verificar
   grants/RLS ao vivo (não confiar em leitura estática da migration — lição da Onda 3 §5.3),
   só então repetir em produção, com o mesmo required reviewer do GitHub Environment
   `production` no caminho.
4. **Produção continua vazia de dado real até o Gate R0 ser aprovado.** Nenhuma migration deste
   documento, quando implementada, deve inserir dado além de estrutura (tabela, função, policy,
   grant) em produção — nenhum `INSERT` de teste, nenhum seed, mesma disciplina que manteve
   produção com 0 linhas em `markets`/`products`/`prices` desde o fechamento da Onda 2.
5. **O spike de 50 cupons (`PLANO-MESTRE.md` §10)**, quando autorizado, roda primeiro contra o
   schema aplicado em staging com dado sintético para provar o pipeline de ponta a ponta (QR,
   consulta, parsing, dedup, aprovação, Pix simulado ou de valor simbólico) antes de qualquer
   lote tocar produção — mesmo princípio de "lotes com stop/go" já descrito no Plano Mestre,
   aplicado também à camada de banco, não só à operação.

---

## 9. Processo de aprovação de preços/remarcações (Achados)

Fluxo descrito em `PLANO-MESTRE.md` §3: "Mercado manda foto do remarcado pelo WhatsApp → pipeline
transforma em Achado do dia → card vai para grupos e canais locais". A parte que falta hoje no
schema é como o "Achado" vira uma linha em `prices` com `is_featured = true` de forma auditável e
reversível.

### 9.1 Entrada e fila de revisão

```sql
-- ESBOÇO — não aplicado.
CREATE TABLE public.achado_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchant_accounts(id),
  product_id uuid REFERENCES public.products(id),   -- nulo até o matching automático resolver
  raw_input_summary text NOT NULL,                  -- descrição textual do que o pipeline extraiu (nunca a mídia bruta, ver §10)
  proposed_price numeric NOT NULL CHECK (proposed_price > 0),
  proposed_valid_until timestamptz,
  confidence numeric CHECK (confidence BETWEEN 0 AND 1), -- score do matching automático
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'published', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);

ALTER TABLE public.achado_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achado_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.achado_submissions TO service_role;
```

O pipeline de ingestão (mesmo componente descrito em `PLANO-MESTRE.md` §4.2, "produto, marca,
variante, tamanho, preço, mercado, fonte, validade e confiança") grava aqui, não direto em
`prices`. Casos abaixo do limiar de confiança (meta operacional: menos de 10% dos casos exigindo
intervenção especializada, mesmo §4.2) ficam com `product_id = NULL` até revisão manual resolver
o matching — consistente com o princípio #1 do `CLAUDE.md` ("busca aproximada sugere candidatos;
não autoriza juntar produtos diferentes").

### 9.2 Publicação

```sql
-- ESBOÇO — não aplicado.
CREATE OR REPLACE FUNCTION public.publish_achado(
  p_submission_id uuid,
  p_operator_identity text,
  p_justification text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission public.achado_submissions;
  new_price_id uuid;
BEGIN
  IF p_operator_identity IS NULL OR length(trim(p_operator_identity)) = 0 THEN
    RAISE EXCEPTION 'operator_identity obrigatorio';
  END IF;

  SELECT * INTO submission FROM public.achado_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achado % nao encontrado', p_submission_id;
  END IF;
  IF submission.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Achado % ja foi revisado (status=%)', p_submission_id, submission.status;
  END IF;
  IF submission.product_id IS NULL THEN
    RAISE EXCEPTION 'Achado % sem product_id resolvido — matching pendente', p_submission_id;
  END IF;

  INSERT INTO public.prices (
    product_id, market_id, price, source_type, observed_at, valid_until,
    is_featured, source_reference
  )
  SELECT
    submission.product_id, ma.market_id, submission.proposed_price, 'social_media',
    now(), submission.proposed_valid_until, true,
    'achado_submissions:' || submission.id::text
  FROM public.merchant_accounts ma WHERE ma.id = submission.merchant_id
  RETURNING id INTO new_price_id;

  UPDATE public.achado_submissions SET status = 'published' WHERE id = p_submission_id;

  INSERT INTO public.operation_audit_log (
    entity_type, entity_id, action, operator_identity, justification,
    previous_status, new_status
  ) VALUES (
    'achado_submission', p_submission_id, 'published', p_operator_identity,
    coalesce(p_justification, 'Publicacao de Achado apos revisao'),
    'pending_review', 'published'
  );

  RETURN new_price_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_achado(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_achado(uuid, text, text) TO service_role;
```

Esse desenho assume `merchant_accounts.market_id` referenciando a tabela `markets` já
existente — o cadastro de comerciante (§1, `merchant_accounts`) vincula o comerciante ao
`market_id` correspondente, então publicar um Achado não exige que o operador escolha o
mercado manualmente a cada vez.

`source_type = 'social_media'` reaproveita um valor já existente no enum de `prices`
(`CLAUDE.md` "Modelo de dados") em vez de propor um valor novo — Achado publicado via WhatsApp é
exatamente esse caso de uso.

### 9.3 Rollback

Publicar errado (preço trocado, mercado errado, produto errado) precisa de reversão sem
apagar o rastro. Proposta: **nunca `DELETE` em `prices`** — em vez disso, uma função
`retract_achado(price_id, operator_identity, justification)` que faz `UPDATE prices SET
is_active = false` (o mesmo mecanismo que já governa "preço válido" no princípio #2 do
`CLAUDE.md` — `is_active AND observed_at <= now() AND ...`) e grava a reversão em
`operation_audit_log`. O preço errado para de aparecer na comparação e nos Achados
imediatamente (a policy de `SELECT` já filtra por `is_active`), mas a linha continua existindo
para investigação — mesmo espírito de "sem atalhos que escondem erro" do princípio #8 do
`CLAUDE.md`.

### 9.4 `price_submissions` (comunidade) — reativação futura, não parte deste piloto

`PLANO-MESTRE.md` §5 explicitamente marca "Moderação pública de submissão da comunidade" como
**fora** do escopo do MVP Artemis. Este documento não propõe reabrir `price_submissions` agora.
Registra, para quando essa decisão futura for tomada, que o caminho já está desenhado e só falta
religar com proteção: `approve_submission(uuid)` já existe, já está corrigida (grants explícitos,
`THREAT-MODEL-ONDA-3.md` §5.3), e a política de reabertura já está definida em
`THREAT-MODEL-ONDA-3.md` §4.2 (validação server-side, anti-abuso, rate limit, testes de bypass,
novo gate do PMO/Founder, tudo na mesma migration que reabre o `INSERT`). Nenhuma ação nova é
proposta aqui — só a confirmação de que o padrão herdado já cobre esse caso quando ele for
priorizado.

---

## 10. Proteção de comprovantes e documentos fiscais

A imagem/XML do cupom (e qualquer mídia recebida via WhatsApp) é o dado de maior sensibilidade
prática deste documento — mais do que o schema relacional em si, porque pode conter dado
incidental além do cupom (ex.: outros itens do carrinho, ambiente da foto).

### Onde fica

**Supabase Storage, bucket privado dedicado** (ex.: `nfce-evidence`), nunca um bucket público.
Nenhuma imagem ou XML é commitado no Git, nunca aparece em log de aplicação, nunca aparece em
mensagem de erro (§3, §5 — mesma disciplina de "nunca logar a chave bruta"). O bucket não tem
policy de leitura pública — leitura só via `service_role` (para o pipeline processar) ou via URL
assinada de curta duração (para o operador humano visualizar durante a revisão, quando
necessário).

### Controle de acesso

| Ator                                  | Acesso ao bucket                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `anon` / `authenticated`              | Nenhum — sem policy de Storage para esses papéis                                                                              |
| Pipeline de ingestão (`service_role`) | Leitura/escrita para processar (upload da mídia recebida, extração)                                                           |
| Operador humano (painel interno)      | URL assinada com expiração curta (minutos, não dias), gerada sob demanda pelo painel, nunca um link permanente compartilhável |

### Tempo de retenção

Decisão de prazo exato fica em `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md` (preparado em
paralelo). O desenho deste documento só garante que a arquitetura **permite** cumprir qualquer
prazo que aquele documento definir: a mídia bruta fica isolada em um bucket dedicado (não
misturada com nenhum outro asset do produto), o que torna trivial aplicar uma rotina de expurgo
por idade sem tocar em nenhuma outra parte do Storage, e a referência à mídia em
`nfce_receipts`/`achado_submissions` (se existir) é um path/id, não a mídia em si — apagar o
objeto do Storage não exige tocar na linha relacional correspondente, nem vice-versa.

---

## 11. Tratamento de erros e reprocessamento

Nenhum retry deste desenho pode duplicar um pagamento. Os três casos citados no mandato:

### Parsing de cupom falha

`nfce_receipts.status = 'parse_failed'`, com `parse_error` preenchido (mensagem técnica, nunca a
chave fiscal bruta). Fica em fila de revisão manual — **não** há retry automático ilimitado; um
contador de tentativas (`retry_count`, esboço) limita reprocessamento automático a um número
pequeno antes de exigir intervenção humana, seguindo a meta operacional de
`PLANO-MESTRE.md` §4.2 (menos de 10% de casos exigindo especialista).

### Pix falha

`cashback_ledger.status = 'pix_failed'`. Como o `ledger_id` já é a chave de idempotência enviada
à instituição parceira (§5), um reprocessamento seguro consiste em **reenviar com o mesmo
`ledger_id`**, não criar um novo lançamento. Se o parceiro suportar consulta de status por
idempotency key, o processo interno **consulta antes de reenviar** — nunca assume que "falhou"
significa "não foi processado do lado do parceiro"; timeout e falha reportada são tratados
diferente: falha reportada permite retry direto, timeout exige consulta de status primeiro.

### Timeout (qualquer chamada externa: SEFAZ ou Pix)

Timeout nunca é interpretado como "não aconteceu". Antes de qualquer nova tentativa, o processo
interno consulta o estado atual do lado externo (status da nota na SEFAZ, status do Pix no
parceiro) quando a API externa suporta consulta; quando não suporta, o desenho assume o cenário
mais conservador (tratar como "pode ter acontecido") e exige confirmação humana antes de
reenviar — nunca reenvia automaticamente uma operação com efeito financeiro sem essa checagem.

### Máquina de estados de reprocessamento, resumida

```
nfce_receipts:      received → parsing → parse_failed → (retry limitado) → parsing → ...
cashback_ledger:    pending_payment → pix_failed → (consulta de status) → pix_paid | retry seguro por ledger_id
```

Nenhum estado de erro é silenciosamente descartado — toda falha permanece visível na tabela
correspondente até resolução manual ou automática dentro do limite de tentativas, nunca apagada.

---

## 12. Exclusão verificável

Consistente com `docs/r0/PRIVACY-AND-CONSENT-REQUIREMENTS.md` (preparado em paralelo, apenas
referenciado aqui). Do lado da arquitetura de banco, a proposta é:

1. **Exclusão real, não soft-delete disfarçado, quando o titular pede exclusão.** Diferente da
   reversão de Achado (§9.3, que usa `is_active = false` porque é um erro operacional, não um
   pedido de titular), um pedido de exclusão de dado pessoal deve resultar em `DELETE` de fato
   das linhas identificáveis (`nfce_receipts`, mídia em Storage, `cashback_ledger` do domicílio)
   — decisão final de quais campos precisam de exclusão vs. anonimização (ex.: manter um total
   agregado sem vínculo ao domicílio para fins de reconciliação financeira) é do documento de
   privacidade, não deste.
2. **Prova de exclusão.** Antes de excluir, o processo interno registra em
   `operation_audit_log` uma linha `action = 'deletion_requested'` com uma referência não
   reversível (hash, não o dado bruto) para permitir provar depois "esta pessoa pediu exclusão
   nesta data" sem manter o dado que foi excluído. Depois de excluir, uma segunda linha
   `action = 'deletion_completed'` com uma contagem de linhas afetadas (não os dados em si)
   serve como evidência auditável de que a exclusão de fato aconteceu — o mesmo padrão de
   "trilha apenas-anexa" de `operation_audit_log` (§6) garante que essa prova não pode ser
   apagada junto com o dado original.
3. **Efeito em cima da deduplicação (§5).** Excluir um `nfce_receipts` levanta a pergunta: a
   mesma chave fiscal pode ser reenviada depois? Proposta: manter o `fiscal_key_hash` em uma
   tabela de dedup separada e mínima (só o hash + data, sem nenhum outro campo pessoal) mesmo
   após a exclusão do registro operacional completo — isso preserva a garantia de "nunca paga
   duas vezes pela mesma nota" (`CLAUDE.md` §9) sem reter nenhum dado pessoal além do hash, que
   por desenho (HMAC com pepper secreto) não é reversível para a chave original. Esse desenho —
   manter só o hash de dedup indefinidamente vs. expurgar tudo — é exatamente o tipo de decisão
   que precisa de revisão jurídica/de privacidade explícita antes de ir para produção (mandato
   de `PLANO-MESTRE.md` §10, item "revisão jurídica/privacidade do piloto").

---

## 13. Dados sintéticos — conformidade deste documento

Todo exemplo de schema, DDL ou dado ilustrativo neste documento usa valores obviamente
fictícios, seguindo a mesma regra de `supabase/seed.sql`:

- nenhum CNPJ real (onde um CNPJ aparece como exemplo, seria o padrão de teste
  `00.000.000/0001-91`, reconhecidamente inválido/fictício — nenhum CNPJ de exemplo foi de fato
  inserido em nenhum lugar deste documento além desta menção);
- nenhuma chave de acesso de NFC-e real — nenhuma chave concreta aparece neste documento, só a
  descrição do formato (44 dígitos);
- nenhum nome de mercado real — este documento não usa nenhum nome de mercado, real ou
  fictício, além de referências genéricas ("comerciante", "mercado");
- nenhum CPF em nenhum exemplo — a identidade de domicílio é tratada como `household_ref`
  pseudonimizado, nunca como CPF, mesmo em esboço de schema.

---

## 14. Resumo — o que este documento entrega e o que fica para depois

**Entrega:**

- caminho de escrita para cada fluxo novo, sem exceção a `anon`/`authenticated` escrevendo em
  tabela sensível;
- confirmação de que `authenticated` continua sem uso, sem violar o princípio #9 do
  `CLAUDE.md`, e proposta de como resolver identidade de operador interno sem criar um papel de
  banco novo;
- onde a validação de CNPJ/valor/cupom acontece (sempre servidor, nunca cliente);
- por que rate limiting de borda não é um bloqueio para estes fluxos específicos (nenhum tem
  `INSERT` público), com a regra herdada da Onda 3 para o dia em que isso mudar;
- desenho de deduplicação por HMAC, consistente com `CLAUDE.md` §9;
- desenho de auditoria com identidade de operador e justificativa obrigatórias, mais rico que
  `approve_submission` porque envolve dinheiro;
- controles antifraude mínimos mapeados a `PLANO-MESTRE.md` §9 e §7;
- reaproveitamento do isolamento staging/produção já provado;
- processo de publicação/rollback de Achado sem `DELETE`;
- proteção de mídia (Storage privado, URL assinada, sem log);
- tratamento de erro sem duplicar pagamento;
- desenho de exclusão verificável com prova apenas-anexa.

**Fica para depois, fora do escopo deste documento:**

- migration real (`supabase/migrations/`) — tarefa de engenharia separada, com sua própria
  revisão e checkpoint;
- texto de consentimento, base legal e inventário de dados —
  `docs/r0/PRIVACY-AND-CONSENT-REQUIREMENTS.md`;
- prazos de retenção exatos por tabela/tipo de mídia —
  `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md`;
- decisão de qual das duas alternativas de identidade de operador (§2) o piloto de fato usa;
- integração concreta com a instituição parceira de Pix;
- execução do spike de 50 cupons em si.

Nenhum item deste documento autoriza a Onda 5, o piloto Artemis ou qualquer coleta de dado
real. A aprovação desta proposta pelo PMO/Founder é um passo do Gate R0 (`PLANO-MESTRE.md`
§10), não o gate inteiro.
