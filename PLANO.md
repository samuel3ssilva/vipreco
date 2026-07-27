# PLANO.md — Preço Artemis

> Visão do produto final, tese de negócio e escopo do MVP de teste.
> O `CLAUDE.md` governa **como** trabalhar no código; este arquivo governa **o quê** e **por quê**.
> Última revisão: 2026-07-27.

---

## 1. Tese

O Preço Artemis é um comparador de preços de supermercado que nasce em um bairro
para conquistar uma cidade.

- **Artemis** (bairro de Piracicaba-SP, ~6 mil habitantes, 4–5 mercados relevantes)
  é o **laboratório**: cobertura de 100% dos mercados é viável para uma pessoa,
  a família do fundador mora no bairro (distribuição via WhatsApp, coleta e
  credibilidade), e o custo de errar é baixo.
- **Piracicaba** (~500 mil habitantes, dezenas de mercados independentes + redes
  regionais) é o **mercado real**, tanto de audiência quanto de receita B2B.
- O ativo de longo prazo não é o app: é o **playbook replicável**
  (operação de dados + pacote comercial + distribuição local) validado em Artemis.

**Regra de ouro:** toda decisão de MVP responde à pergunta
_"isso funciona quando forem 50 mercados em vez de 5?"_ — mas nada é construído
para 50 mercados antes do gate da Onda 3.

---

## 2. Produto final (visão — fase Piracicaba)

### 2.1 Para o consumidor (sempre gratuito e neutro)

- Busca de produto exato e comparação de preços válidos entre mercados,
  ordenada **exclusivamente por preço** — a neutralidade do ranking orgânico é
  inegociável e é o ativo central do produto.
- Seletor de região/bairro; "mercado habitual" salvo apenas no aparelho, sem login.
- "Cesta da semana" pública por região: o custo da cesta básica em cada mercado,
  em formato compartilhável (o produto editorial que resolve o cold start de valor).
- Cards de compartilhamento para WhatsApp — o canal de distribuição nº 1.
- Selos de fonte com pesos visuais distintos (nota fiscal > pesquisa > comunidade);
  transparência total sobre origem, data e validade de cada preço.

### 2.2 Para mercados — pacote "Mercado Parceiro" (núcleo da receita)

Um único pacote mensal, vendido pessoalmente, que agrupa quatro entregas:

| Entrega                 | O que é                                                                                                                      | Base técnica                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Implantação de catálogo | Carga e manutenção do catálogo do mercado (taxa de setup + mensalidade — o cliente paga para resolver o cold start de dados) | `products` + `prices` com `source_type='store_list'`               |
| Perfil oficial          | Página do mercado com selo verificado, endereço, horário e **botão de WhatsApp**                                             | Nova rota + campos em `markets`                                    |
| Ofertas oficiais        | Encarte semanal publicado como ofertas rotuladas, com validade — cada oferta gera card compartilhável                        | `prices.is_featured` + `valid_until`, seção separada da comparação |
| Relatório mensal        | Posição de preços do mercado vs. concorrência, PDF (manual no início)                                                        | Dados já existentes + `decision_feedback`                          |

Guardrails permanentes: oferta paga **nunca** reordena a lista orgânica;
**nunca vender exclusividade**; contrato simples, cobrança via Pix, sem fidelidade.

### 2.3 Monetização por fase

| Fase              | Forma                                                                                                       | Status                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Artemis (piloto)  | Pacote Mercado Parceiro (2 clientes-âncora)                                                                 | Validação de disposição a pagar |
| Piracicaba        | Pacote Parceiro em escala + geração de clientes via WhatsApp com métricas + relatório premium por categoria | Ativa após o gate               |
| Piracicaba madura | Painel de inteligência competitiva para independentes                                                       | Exige densidade de dados        |
| Multi-cidade      | Marca branca / replicação do playbook; estudos para indústria; API de preços                                | Fora do horizonte atual         |

Cortadas até existir cobertura multi-cidade (nenhum comprador existe antes disso):
estudos para fabricantes, API de preços, campanhas patrocinadas por desempenho.

### 2.4 Fora de escopo permanente do produto consumidor

Login de consumidor, pagamentos no app, carrinho, cashback, entrega,
geolocalização automática (seletor manual de região resolve), OCR de nota,
IA embutida no produto, notificações push (reavaliar só após o gate).

---

## 3. Estado atual do V0 (auditoria de 2026-07-27)

### Já entregue e funcionando

- Regras de comparação como funções puras testadas (`src/lib/comparison.ts`,
  20/20 testes passando): preço válido, mais recente por mercado, ordenação por
  preço, comparação com mercado habitual.
- Schema com RLS de qualidade: validade dos preços garantida **na policy**
  (anônimo não lê preço vencido/inativo), grants explícitos, submissões travadas
  em `pending`, busca normalizada com `pg_trgm` + trigger de `search_text`.
- Instrumentação de validação já embutida: `decision_feedback`
  (utilidade da comparação) e `product_watch_requests` (demanda por produto).
- Ganchos do pacote parceiro semi-prontos: `prices.is_featured` (seção separada,
  não afeta o ranking) e `source_type='store_list'`.
- Flags `is_demo` + aviso de ambiente de teste; seed fictício completo.
- Build de produção passando com alvo Cloudflare (Nitro); rota de sitemap.

### Lacunas conhecidas (viram tarefas nas ondas abaixo)

1. `.env` commitado em repo público e ausente do `.gitignore`; não há `.env.example`
   (as chaves são publishable — sem vazamento de segredo — mas é higiene obrigatória).
2. 397 erros de lint, todos Prettier (um `--fix` resolve).
3. Sem proteção contra duplicação de produto: falta índice único parcial em `gtin`
   e unicidade da identidade canônica (name+brand+variant+size_text normalizados).
4. Desempate de preços mais recentes usa só `observed_at` (falta `created_at`/`id`).
5. `markets` não tem `city` — pré-requisito barato da expansão.
6. Nenhuma proteção anti-spam nos três inserts anônimos.
7. Não existe fluxo de moderação (aprovar `price_submissions` → criar `prices`).
8. Sem meta tags de compartilhamento (Open Graph) para WhatsApp.

---

## 4. MVP de teste — Artemis

Princípio: o V0 **não precisa de features novas para lançar** — precisa de
higiene, dados reais e distribuição. A instrumentação do piloto já existe no schema.

### Onda 0 — Higiene da fundação (1–2 dias)

- [x] A0.1 Rodar `bun run format` e zerar `bun run lint`.
- [x] A0.2 Adicionar `.env` ao `.gitignore`, `git rm --cached .env`, criar `.env.example` sem valores.
- [x] A0.3 Migration: índice único parcial em `products.gtin` (WHERE gtin IS NOT NULL) + unicidade da identidade canônica normalizada (name+brand+variant+size_text).
- [x] A0.4 Desempate determinístico em `latestValidPricePerMarket` (`observed_at` → `created_at` → `id`) + teste.
- [x] A0.5 Migration: coluna `markets.city` NOT NULL DEFAULT 'Artemis' + índice.
- [x] A0.6 Migration: função `approve_submission(submission_id)` (SECURITY DEFINER, executável só por `service_role` via Studio) que cria o `price` e marca a submissão como `approved`.
- [ ] A0.7 Substituir o CLAUDE.md antigo pelo novo (stack real) e commitar este PLANO.md.

Critério de conclusão: `bun run lint && bun run test && bun run build` com saída zero.

### Onda 1 — Lançamento em Artemis (1–2 semanas)

- [ ] A1.1 Cadastrar os 4–5 mercados reais (nome, bairro, endereço, maps_url).
- [ ] A1.2 Definir a cesta de ~40 SKUs prioritários (cesta básica + itens de `product_watch_requests` do teste) e cadastrar com GTIN real.
- [ ] A1.3 Primeira coleta completa de preços (`source_type='weekly_audit'`); rotina semanal documentada (dia fixo, rota, responsável).
- [ ] A1.4 Desativar registros `is_demo` e remover o aviso de ambiente de teste.
- [ ] A1.5 Meta tags Open Graph por produto (nome, menor preço, mercado) para preview bonito no WhatsApp.
- [ ] A1.6 Honeypot no formulário de sugestão + limite suave de envios por sessão (client-side é suficiente no piloto).
- [ ] A1.7 Divulgação nos grupos de WhatsApp do bairro via família; registrar em qual grupo/data cada link foi postado.

**Nenhuma feature nova de produto nesta onda.**

### Onda 2 — Mercado Parceiro (inicia quando houver sinal de tração de consumidor)

A venda começa antes do código: a primeira conversa com dono de mercado pode
acontecer durante a Onda 1, com o app na mão.

- [ ] A2.1 Migration: `markets.is_partner`, `whatsapp_number`, `opening_hours`.
- [ ] A2.2 Rota `/mercado/$marketId`: perfil com selo, endereço, horário e botão de WhatsApp (registrar cliques — contador simples serve).
- [ ] A2.3 Exibição de ofertas oficiais do parceiro (`is_featured` + `store_list`) em seção rotulada "Oferta oficial do mercado", nunca reordenando a comparação.
- [ ] A2.4 Processo manual documentado: recebimento do encarte semanal → cadastro → card compartilhável.
- [ ] A2.5 Template do relatório mensal (feito à mão nos primeiros meses).
- [ ] A2.6 Fechar 1º parceiro (desconto agressivo ou 1º mês grátis em troca de caso + encarte garantido); 2º parceiro a preço cheio.

Preços do pacote: hipótese R$ 150–400/mês + taxa de setup — validar na primeira
conversa, não no planejamento.

### Onda 3 — Gate de Piracicaba (sem código)

Avaliação formal 90–120 dias após o lançamento da Onda 1. Expandir **somente se
as três provas forem verdadeiras**:

| #   | Prova                      | Meta                                                                                                             | Como medir                               |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Consumidores usam e voltam | 150–200 usuários únicos/mês (~10% dos lares de Artemis) com 25–30% de retorno semanal                            | Analytics (ver §6) + `decision_feedback` |
| 2   | Mercados pagam             | 2 parceiros pagando por 3 meses consecutivos                                                                     | Contratos ativos                         |
| 3   | O flywheel de dados gira   | ≤50% dos preços vigentes coletados pelo próprio fundador (restante: encartes de parceiros + comunidade aprovada) | `prices.source_type`                     |

Se qualquer prova falhar: diagnosticar, ajustar e re-testar em Artemis.
Expandir um flywheel que não gira é multiplicar um problema.

Kill criteria (encerrar ou repensar o projeto): após 2 ciclos de ajuste,
retenção semanal < 10% **ou** nenhum mercado disposto a pagar qualquer valor.

---

## 5. O que a expansão para Piracicaba exigirá (registro, não tarefa)

Só entra em planejamento detalhado após o gate: seletor de região na interface;
recrutamento de coletores/embaixadores por bairro; onboarding de parceiros em
escala (aí sim nasce a discussão de painel B2B, organizações e papéis);
anti-spam server-side (rate limit em edge function); SEO local por bairro.

---

## 6. Instrumentação e métricas

- **Já no schema:** `decision_feedback` (a comparação ajudou? que decisão gerou?)
  e `product_watch_requests` (demanda por produto → prioriza a coleta).
- **Falta e entra na Onda 1:** analytics de audiência privacy-friendly
  (decisão pendente: Cloudflare Web Analytics — zero config no deploy atual — ou
  Umami self-hosted). Sem cookies, sem dados pessoais.
- **Métricas operacionais semanais:** % de preços com menos de 7 dias;
  nº de submissões da comunidade; tempo até aprovação; cliques no WhatsApp por parceiro.

---

## 7. Riscos principais

| Risco                                                            | Mitigação                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Reputacional: percepção de favorecimento em bairro pequeno       | Ranking orgânico intocável, rótulos claros, sem exclusividade, página "Como funciona" transparente |
| Operacional: coleta depende de uma pessoa                        | Rotina documentada, família treinada, flywheel como meta explícita do gate                         |
| Dados: duplicação de produto quebra a confiança                  | Constraints de unicidade (A0.3) + revisão manual de novos produtos                                 |
| Spam nos inserts anônimos                                        | Honeypot + limites no piloto; server-side antes de Piracicaba                                      |
| Concentração comercial: perder 1 de 2 parceiros = 50% da receita | Relação > contrato; sem fidelidade; valor entregue semanalmente                                    |

---

## 8. Decisões pendentes

1. Ferramenta de analytics (Cloudflare Web Analytics vs. Umami) — decidir na Onda 1.
2. Preço do pacote Mercado Parceiro — validar na primeira conversa de venda.
3. Domínio próprio e nome público final (Preço Artemis serve para o piloto; a expansão pedirá marca que funcione em Piracicaba inteira).
4. Momento de reavaliar notificações/lista de compras como mecanismo de retenção — somente após o gate.
