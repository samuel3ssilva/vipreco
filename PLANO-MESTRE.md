# ViPreço — Plano Mestre v2.1

**Status:** aprovado pelo PMO para uso como referência estratégica e operacional, condicionado aos gates humanos definidos neste documento.
**Revisão:** 2026-07-29.
**Substitui:** `PLANO-MESTRE_ViPreco-v2.md`.
**Não substitui:** `CLAUDE.md`, que continua governando como trabalhar no código, nem o histórico oficial das Ondas 0–6.

---

## 0. Regra de governança

Este documento separa duas trilhas que antes estavam misturadas:

1. **Trilha de Fundação e Segurança — Ondas 0 a 6**
   Infraestrutura, contas, staging/produção, segurança, resiliência, dados reais e expansão.

2. **Trilha de Produto e Validação — P0 a P4**
   Spike de NFC-e, pipeline de ingestão, Achados do dia, piloto Artemis, coleta e campanha.

As trilhas podem ter trabalho preparatório em paralelo apenas quando não houver dados reais, deploy público, custo, credencial ou ação irreversível. Nenhuma tarefa da trilha de produto renumera, reabre ou apaga uma Onda já concluída.

### Gates humanos permanentes

Exigem autorização ou execução direta do Founder:

- custos, planos e pagamentos;
- criação, cadastro, rotação e revogação de credenciais;
- GitHub Environments e secrets;
- primeiro deploy de um ambiente novo;
- produção pública e DNS;
- dados reais e participantes;
- exclusões e ações irreversíveis;
- merge de pull request;
- decisões jurídicas, privacidade, contratação e divulgação pública.

### Autonomia do CTO

O CTO pode trabalhar sem confirmações intermediárias em tarefas locais, reversíveis e dentro do escopo:

- investigação, leitura e planejamento;
- branches, código, migrations, scripts, workflows, testes e documentação;
- leitura de arquivos locais ignorados pelo Git, sem imprimir valores;
- lint, test, build, dry-runs e consultas somente de leitura;
- correções dentro do escopo;
- atualização de pull request;
- verificação de CI e CodeQL;
- revisão adversarial e preparação do checkpoint humano consolidado.

O CTO deve agrupar ações humanas em um único checkpoint sempre que possível.

---

## 1. Estado oficial do projeto

### Trilha de Fundação e Segurança

| Onda                                           | Estado | Observação   |
| ---------------------------------------------- | -----: | ------------ |
| Onda 0 — Baseline                              |     ✅ | Concluída    |
| Onda 1A — GitHub, CI e scans                   |     ✅ | Concluída    |
| Onda 1B — Saída da Lovable                     |     ✅ | Concluída    |
| Onda 1C — Contas, MFA e credenciais            |     ✅ | Concluída    |
| Onda 2 — Staging e produção separados          |     ✅ | Concluída    |
| Onda 3 — Segurança da aplicação, banco e borda |     🟡 | Em andamento |
| Onda 4 — Resiliência operacional               |     ⬜ | Pendente     |
| Onda 5 — Dados reais e piloto Artemis          |     ⛔ | Bloqueada    |
| Onda 6 — Revisão externa e expansão            |     ⬜ | Pendente     |

### Estado confirmado do fechamento da Onda 2

- PR #11 mergeado em `main` (`559e9f6`), CI e CodeQL verdes, 0 alertas;
- Worker de staging (`samuel3ssilva-vipreco`) e Worker de produção (`vipreco-production`) implantados, cada um com Supabase próprio;
- GitHub Environments `staging` e `production` criados, `production` restrito a `main` com required reviewer;
- oito secrets cadastrados (quatro por ambiente), nenhum valor exposto em log, diff ou commit;
- isolamento comprovado por dado real observado: produção com 0 linhas em `markets`/`products`/`prices`, escrita anônima bloqueada (401); staging preserva os 4 mercados fictícios de sempre;
- DNS de `vipreco.com.br` permanece sem apontamento;
- nenhum dado real foi cadastrado.

### Estado da Onda 3 (em execução)

- branch `security/onda-3-hardening` criada a partir de `main` (`559e9f6`);
- mandato registrado em `docs/governance/PROMPT-CTO_ONDA-3.md`;
- escopo: threat model, auditoria de banco/RLS/grants, `approve_submission()` e recursos dormentes, frontend/bundle, headers/CSP, Turnstile/rate limit condicionado à superfície real, acessibilidade técnica, adoção reversível do Brand System v2, supply chain;
- nenhuma migration aplicada remotamente, nenhum deploy executado, nenhum dado real cadastrado.

### Regras imediatas

- não alterar DNS;
- não cadastrar dados reais;
- não remover aviso de teste do staging;
- não remover `approve_submission()` sem migration nova, plano de reversão e apresentação no checkpoint humano;
- não mexer nos PRs do Dependabot;
- não fazer merge automático do PR da Onda 3;
- não iniciar Onda 4 ou trilha de produto dentro desta branch.

---

## 2. Tese

> **Rede operacional e de mídia transacional para o varejo alimentar independente, agnóstica de PDV, com atribuição de venda por documento fiscal.**

A comparação de preço não é o produto; é o custo de aquisição de audiência. Soluções públicas baseadas em documentos fiscais já operam em diversos estados e tendem a expandir. Não construir valor defensável apenas sobre preço público.

### Moat — o que resiste a quem

| Camada                                                 |    SEFAZ    |      Fornecedor de PDV      |
| ------------------------------------------------------ | :---------: | :-------------------------: |
| Base histórica de preços                               |    mata     |              —              |
| Canal prospectivo: remarcação, ruptura e horário morto | **resiste** |          copiável           |
| Relação e rotina operacional do comerciante            | **resiste** |           ameaça            |
| Cashback com atribuição fiscal                         | **resiste** |          copiável           |
| **Neutralidade entre varejistas concorrentes**         |   resiste   | **resiste estruturalmente** |
| **Um contrato da indústria para centenas de lojas**    |   resiste   | **resiste estruturalmente** |
| **Cesta completa do domicílio, cross-varejista**       |   resiste   | **resiste estruturalmente** |

As defesas estruturais são neutralidade, agregação comercial da cauda longa e visão cross-varejista. Um fornecedor de PDV não tem incentivo para mostrar que uma loja concorrente está mais barata e sua audiência é fragmentada por cliente e software.

**Não são defesas:** exclusividade contratual, retenção por saldo de cashback ou base proprietária de preço.

Se a SEFAZ-SP ampliar a oferta pública, isso reduz o custo de coleta histórica e não destrói o canal prospectivo, a relação com o varejista, a atribuição de campanha nem a neutralidade. A ameaça mais relevante vem de plataformas que já têm audiência e lojas, e de fornecedores de PDV que já estão dentro da operação. Contra PDVs, a estratégia preferencial é adaptador e revenue share, não guerra frontal.

---

## 3. Como o produto funciona

```text
Mercado manda foto do remarcado pelo WhatsApp, pela manhã
      ↓
Pipeline transforma o material em Achado do dia
      ↓
Card em imagem vai para grupos e canais locais
      ↓
Pessoa vai à loja e paga o preço de gôndola, sem código no caixa
      ↓
Pessoa envia o cupom fiscal e, quando elegível, recebe Pix após validação
      ↓
O cupom devolve uma cesta de preços com loja, data e hora
      ↓
Os dados realimentam a base, o app e os próximos Achados
```

### Regras do loop

1. **O Achado é público.** Qualquer pessoa que vá à loja encontra o mesmo preço, durante a validade informada.
2. **O benefício é exclusivo da campanha.** O cashback remunera uma contribuição fiscal elegível, não compra o desconto da loja.
3. **O benefício não sai do capital da empresa**, exceto o orçamento de pesquisa do MVP, com teto total de R$ 1.000. Depois do experimento, o benefício deve ser pré-financiado pelo comerciante, indústria ou parceiro.
4. **Pix ocorre após a compra e a validação.** Não há integração com PDV, desconto no caixa ou carteira proprietária.

### Por que a remarcação é o combustível inicial

Remarcação tem valor antes de existir grande audiência, é prospectiva, não aparece em bases fiscais antes da venda e existe em todos os mercados. A disputa é por urgência e recuperação de perda, não por declarar um vencedor permanente do bairro.

---

## 4. MVP — Artemis

### O que Artemis testa

Artemis não prova demanda espontânea generalizável, CAC de consumidor, venda fria para lojistas, incrementalidade rigorosa nem alavancagem em dezenas de lojas.

Artemis testa quatro perguntas:

1. O comerciante alimenta a rotina com no máximo o lembrete padrão?
2. O consumidor envia novamente um cupom com incentivo decrescente?
3. Um terceiro opera a rotina sem hora de campo do Founder?
4. Uma campanha patrocinada fecha a conta economicamente?

### As quatro peças operacionais

#### 4.1 WhatsApp — entrada do lojista

O lojista envia foto ou áudio curto de um remarcado que já existiria na rotina da loja. Não há dashboard, formulário complexo ou integração de caixa.

**Risco:** a rotina morre quando é delegada.
**Defesa:** lembrete padrão em horário fixo, playbook simples e apoio presencial apenas no período inicial.

#### 4.2 Pipeline de ingestão

Entrada possível: foto de gôndola, foto de encarte, áudio e, quando permitido pelo gate de dados, XML ou conteúdo de NFC-e. Saída: produto, marca, variante, tamanho, preço, mercado, fonte, validade e confiança.

O matching deve usar catálogo canônico. Tudo abaixo do limiar de confiança vai para fila de revisão. Meta operacional: menos de 10% dos casos exigindo intervenção especializada.

#### 4.3 NFC-e — piloto concierge

A NFC-e é uma premissa crítica do modelo, mas a automação de consulta, estabilidade, presença de captcha, limites e qualidade das descrições continuam **NOT VERIFIED** até o spike.

No MVP não existe scanner no app, carteira ou feature de cashback. Participantes adultos enviam o cupom por canal concierge; a equipe valida, processa e paga Pix quando elegível.

A curva de incentivo proposta é R$ 5 → R$ 2 → R$ 1 → somente patrocinado, respeitando o teto do experimento.

#### 4.4 Coletor pago

Uma pessoa local percorre os mercados conforme rota definida e documenta preços e etiquetas. O objetivo não é apenas economizar tempo; é testar se existe playbook replicável sem o Founder no campo.

**Risco:** qualidade.
**Defesa:** evidência fotográfica em itens definidos, auditoria inicial e amostragem contínua.

---

## 5. Escopo do MVP

| Entra                                           | Não entra                                    |
| ----------------------------------------------- | -------------------------------------------- |
| Achados do dia                                  | Cesta da semana                              |
| Ingestão por WhatsApp com apoio de LLM          | Login obrigatório                            |
| Spike técnico de NFC-e após Gate R0             | Scanner de QR no app                         |
| Piloto concierge de cupom após Gate R0          | Cashback dentro do app                       |
| Coletor pago                                    | Geolocalização                               |
| Card em imagem para distribuição manual         | Perfil completo de mercado                   |
| Relatório competitivo para o comerciante        | Moderação pública de submissão da comunidade |
| Busca de produtos já existente                  | SEO como frente principal                    |
| Página "Como funciona"                          | Carteira própria                             |
| Crawler apenas como pesquisa comercial separada | Central de compras como produto              |

### Opcional — placar por item

Pode entrar na semana 4–5 somente se o Achado diário já operar sem dependência diária do Founder. Um item só participa quando o mesmo produto canônico aparece em pelo menos dois mercados. Não lançar Achados e placar simultaneamente.

### Opcional — movimento de preço

Pode ser testado após histórico suficiente, sem ranking permanente entre mercados.

### Regra sobre `approve_submission()`

A moderação de submissões da comunidade está fora do MVP. A função e as tabelas já existentes permanecem dormentes até auditoria da Onda 3. Não criar interface, não ampliar permissões e não executar migration destrutiva durante a Onda 2.

---

## 6. Gates de 90 dias

O primeiro comerciante é design partner, com desconto explícito, e não conta no gate de preço cheio. O preço cheio deve ser definido e congelado antes do segundo contrato.

### G1 — Merchant Pull

| Métrica                                |                           Meta | Definição operacional                                                                                                                 |
| -------------------------------------- | -----------------------------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Mercados pagando preço cheio, pré-pago |                            ≥ 3 | Exclui design partner e permutas                                                                                                      |
| Renovação após primeiro resultado      |                            ≥ 1 | Pagamento efetivamente recebido                                                                                                       |
| Remarcações sem cobrança manual        |                          ≥ 70% | Recebidas até o horário combinado usando no máximo o lembrete padrão; sem ligação, visita ou mensagem manual adicional                |
| Benefício econômico documentado        | ≥ 3× mensalidade em ≥1 mercado | Benefício conservador, líquido de custo variável direto, baseado em margem ou descarte evitado; não usar receita bruta como benefício |

### G2 — Receipt Flywheel

| Métrica                             |      Meta | Definição operacional                                                                            |
| ----------------------------------- | --------: | ------------------------------------------------------------------------------------------------ |
| Domicílios adultos na coorte        |     20–25 | Um registro por domicílio; equipe, lojistas e funcionários das lojas fora da coorte paga         |
| Janela                              | 8 semanas | Mesma coorte e regras registradas                                                                |
| Taxa de segunda submissão           |     ≥ 60% | Domicílios com pelo menos dois cupons válidos e distintos ÷ domicílios com primeiro cupom válido |
| Atividade na 4ª semana após redução |     ≥ 40% | Domicílios elegíveis com ao menos um cupom válido no período ÷ coorte exposta à redução          |
| Parsing automático correto          |     ≥ 95% | Medido em amostra auditada e com critério de acerto previamente definido                         |
| Chaves duplicadas aceitas           |         0 | Duplicidade bloqueada antes do pagamento                                                         |
| Custo técnico por nota              | < R$ 0,50 | Compute, APIs e terceiros; benefício e mão de obra humana reportados separadamente               |

### G3 — Operating Leverage

| Métrica                              |     Meta | Definição operacional                                                                                     |
| ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------- |
| Semanas sem hora de campo do Founder |      ≥ 4 | Founder pode atuar em gestão, mas não coleta presencial                                                   |
| Minutos por loja por semana          | ≤ 45 min | Soma de coleta, revisão, matching, correção, atendimento, pagamento e reprocessamento de todas as pessoas |
| Preços dentro da validade            |    ≥ 95% | Publicações ativas auditadas                                                                              |
| Exceções especializadas              |    < 10% | Casos que exigem intervenção além do playbook                                                             |
| Custo variável por loja/mês          | < R$ 150 | Mão de obra variável, APIs, deslocamento e processamento                                                  |

### G4 — Unit Economics

| Métrica                               |                     Meta | Definição operacional                                                                       |
| ------------------------------------- | -----------------------: | ------------------------------------------------------------------------------------------- |
| Campanha fechada de ponta a ponta     |                      ≥ 1 | Contratada, pré-financiada, executada, validada e reconciliada                              |
| Capital próprio financiando benefício |                     R$ 0 | Exceto orçamento formal de pesquisa do MVP                                                  |
| Margem de contribuição                | > 15% do orçamento bruto | Receita menos benefícios, tarifas, impostos, fraude realizada e mão de obra variável direta |

Exemplo de campanha de R$ 1.000: R$ 700 em benefício, R$ 200 de fee ViPreço, R$ 50 de processamento e R$ 50 de reserva de fraude. Reserva não utilizada não vira margem automaticamente; deve ser devolvida, carregada ou tratada conforme contrato.

### Kill criteria

- falha em G2 ou G4 após dois ciclos de ajuste: encerrar ou reformular a tese antes de escalar;
- falha em G1 ou G3: redesenhar operação, proposta e playbook;
- nenhuma métrica pode ser reinterpretada depois do início do ciclo.

---

## 7. Orçamento de pesquisa e elegibilidade

Teto do experimento inteiro: **R$ 1.000**, com hard stop automático ou operacional ao atingir o limite.

Antes de iniciar a coorte, documentar:

- participantes adultos e consentimento específico;
- uma identidade de coorte por domicílio;
- número máximo de cupons pagos por semana e por domicílio;
- intervalo mínimo entre cupons;
- limite total por participante;
- lojas e campanhas elegíveis;
- regra para nota inválida, cancelada, duplicada ou fora da janela;
- prazo de análise e pagamento;
- tratamento de pessoas da equipe, comerciantes e funcionários;
- curva de incentivo e datas de mudança;
- procedimento quando o orçamento acabar.

A curva de incentivo não pode ser alterada retroativamente. Qualquer exceção deve ser registrada.

---

## 8. Roadmap comercial

### MVP — Artemis

Provar os quatro gates. Duas entregas comerciais: canal de Achados e relatório competitivo. Nenhuma feature de consumidor além do Achado.

### Fase 1 — Piracicaba

- login opcional atrás de uma ação;
- cashback patrocinado com Pix via instituição parceira;
- geolocalização por raio;
- cesta genérica volta quando houver diversidade suficiente;
- cesta personalizada a partir do cupom da própria pessoa;
- CRM e reativação por WhatsApp;
- relatório de ruptura;
- central de compras virtual somente após smoke test;
- rede de coletores;
- anti-spam server-side;
- primeiros adaptadores de PDV com revenue share.

**Saída esperada:** 20–30 lojas pagantes, custo marginal por loja em queda e uma campanha de indústria fechada.

### Fase 2 — Interior de São Paulo

Prioridade para cidades do interior antes da capital. Entram licenciamento de insight agregado, marca branca do playbook e painel B2B self-service.

### Fase 3 — Indústria e CPG

Cupom patrocinado por fabricante, validado por documento fiscal, com conversão comprovada. O produto é tornar comprável uma audiência fragmentada. Originação de crédito somente com instituição parceira e sem risco no balanço.

### Fase 4 — MG e ES

Estudar mercados com dados públicos de preço antes da expansão, usando-os como experimento natural para validar se a camada comercial permanece defensável.

### Escada de receita

| Receita                             | Fase     | Modelo                         |
| ----------------------------------- | -------- | ------------------------------ |
| Gestão de remarcação                | MVP      | Mensalidade                    |
| Inteligência competitiva            | MVP      | Mensalidade                    |
| Cotação agregada de fornecedores    | Fase 1   | Fee ou take rate               |
| CRM e reativação por WhatsApp       | Fase 1   | Mensalidade + campanha         |
| Cashback patrocinado / retail media | Fase 1–2 | Fee de mídia + medição         |
| Relatório para distribuidores       | Fase 2   | Assinatura B2B                 |
| Insight agregado de sell-out        | Fase 2–3 | Licença sob governança         |
| Originação de crédito com parceiro  | Fase 3   | Comissão, sem risco no balanço |

**Nunca:** crédito no balanço, estoque próprio, operação logística, carteira proprietária ou ViPreço como merchant of record.

---

## 9. Regras invioláveis

### Neutralidade

Ranking orgânico nunca está à venda. Achado e conteúdo patrocinado ficam em seção separada, rotulada e não reordenam comparação orgânica. A página "Como funciona" deve explicar isso antes da primeira venda B2B.

### Cashback e fraude

- benefício pré-financiado por terceiro, exceto orçamento formal de pesquisa;
- pagamento apenas por item, campanha ou cupom elegível;
- nada por cadastro ou indicação em dinheiro;
- sem carteira proprietária;
- Pix após validação;
- limites por pessoa, domicílio, conta e dispositivo, quando aplicável;
- janela de verificação de cancelamento antes do pagamento.

### Deduplicação fiscal e retenção

O requisito é impedir que a mesma chave fiscal gere benefício mais de uma vez em toda a plataforma. Isso não autoriza reter a chave bruta indefinidamente.

Desenho preferencial:

1. usar a chave bruta somente durante consulta, validação e janela de cancelamento;
2. manter deduplicação por identificador protegido, por exemplo HMAC com segredo separado;
3. eliminar ou reduzir o dado bruto quando a finalidade operacional terminar;
4. documentar retenção, acesso, descarte e exceções;
5. não registrar chave em logs, analytics ou mensagens de erro.

A implementação final depende de revisão técnica e de privacidade.

### Dados e privacidade

- dados vinculáveis são pseudonimizados, não "anônimos";
- consentimentos separados para cashback, personalização e compartilhamento;
- participantes do piloto devem ser adultos;
- aviso de privacidade e protocolo do experimento antes do primeiro cupom real;
- acesso mínimo e auditável;
- retenção e descarte definidos;
- relatório de impacto ou avaliação equivalente antes de painéis B2B ou tratamento de maior risco;
- indústria recebe somente agregado, com coorte mínima e supressão de raridade;
- nenhum recibo individual para indústria;
- proibição contratual de reidentificação;
- usar a expressão "licenciar insights estatísticos agregados sob governança de privacidade", nunca "vender cestas".

### Contrato do comerciante

| Camada                   | Uso                                    | Regra                                 |
| ------------------------ | -------------------------------------- | ------------------------------------- |
| Publicada                | Achado e oferta exibidos ao consumidor | Autorização dentro do serviço         |
| Operacional confidencial | Estoque, remarcação, ruptura, custo    | Nunca vira relatório para concorrente |
| Agregada                 | Insight para indústria ou distribuidor | Cláusula específica e opt-in          |

Contrato simples, mensal, pré-pago, cancelável e sem fidelidade obrigatória.

### Exclusividade

No máximo exclusividade promocional limitada, por até 12 meses, sem renovação automática, sem paridade de preço e sem impedir outros canais.

---

## 10. Gate R0 — antes de qualquer dado real

Nenhum cupom, CPF, histórico de compra, dado de participante ou mercado real pode entrar até o PMO declarar o Gate R0 aprovado.

### Dependências obrigatórias

- Onda 2 encerrada e ambientes isolados;
- Onda 3 encerrada ou com exceção formal aprovada pelo Founder e PMO;
- Onda 4 com backup, restore, logs, alertas e plano de incidente minimamente validados;
- ambiente de produção separado e testado;
- sem dados demo em produção por padrão;
- aviso de privacidade do piloto;
- consentimento e elegibilidade de participantes adultos;
- inventário de dados e finalidade;
- política de retenção e descarte;
- controles de acesso;
- protocolo de pagamento e fraude;
- ledger fiscal testado com dados sintéticos;
- processo de exclusão e atendimento ao titular;
- revisão jurídica/privacidade do piloto;
- aprovação explícita do Founder.

### Estratégia do spike de 50 cupons

Executar em lotes com stop/go:

1. lote inicial pequeno para validar QR, consulta, parsing e armazenamento;
2. revisão de falhas, segurança e custo;
3. lotes seguintes até total de 50, somente se os critérios anteriores passarem.

O total de 50 continua sendo a amostra-alvo; não é autorização para coletar tudo de uma vez.

---

## 11. Sequência dos primeiros 30 dias operacionais

O relógio dos 30 dias começa somente após o Gate R0, não na data de aprovação deste documento.

Orçamento de tempo de referência: aproximadamente 32 horas em quatro semanas.

### P0 — Preparação do experimento

- finalizar documentação do protocolo;
- validar ledger fiscal com dados sintéticos;
- preparar matching e auditoria;
- congelar definições dos gates;
- preparar material do design partner;
- nenhuma coleta real.

### P1 — Spike de NFC-e

- meta de até 50 cupons reais em lotes;
- medir leitura do QR, consulta, captcha, limites, parsing e matching;
- testar duplicidade, nota inválida e cancelamento;
- não construir carteira ou feature de consumidor;
- decisão binária: caminho automatizável ou reformulação da tese.

### P2 — Primeiro comerciante

Piloto de 14 dias por R$ 150–200, como design partner e fora do gate de preço cheio:

1. medir descarte de cinco SKUs perecíveis por cinco dias;
2. registrar o corredor de remarcados;
3. publicar Achados;
4. medir resultado com método conservador;
5. apresentar benefício documentado;
6. transferir a rotina de envio para a loja.

### Dias 31–90

- curva de incentivo com coorte;
- delegação ao coletor;
- comerciantes 2 a 4 a preço cheio;
- campanha patrocinada de ponta a ponta;
- placar por item somente se Achados operarem sozinhos;
- crawler e central de compras fora do caminho crítico.

---

## 12. Escopo de engenharia — ordem oficial

### 12.1 Onda 2 — encerrada

Registro histórico dos passos executados para fechar a Onda 2 (concluída, PR #11 mergeado em `main`):

1. corrigir `SUPABASE_URL` e `VITE_SUPABASE_URL` em `.env.production`, removendo somente `/rest/v1/`;
2. garantir formato `https://<project-ref>.supabase.co`;
3. executar `bun run verify-env:production` sem imprimir valores;
4. validar leitura pública e RLS contra produção, sem escrita real;
5. atualizar `config/environments.json` com o reference ID real;
6. verificar scripts contra mistura de ambientes;
7. conferir que workflow falha fechado quando secrets faltam;
8. executar lint, test e build;
9. atualizar PR #11;
10. verificar CI e CodeQL;
11. preparar checkpoint humano único.

#### Checkpoint humano da Onda 2

O Founder deve receber instruções exatas para:

- criar GitHub Environments `staging` e `production`;
- cadastrar os quatro valores de cada ambiente:
  - `CLOUDFLARE_API_TOKEN`;
  - `SUPABASE_URL`;
  - `SUPABASE_PROJECT_ID`;
  - `SUPABASE_PUBLISHABLE_KEY`;
- criar token Cloudflare dedicado à produção, com menor privilégio suficiente e escopo de conta correto;
- configurar o Founder como required reviewer em `production`, quando suportado pelo plano;
- autorizar explicitamente o primeiro deploy.

O CTO não deve pedir valores no chat nem imprimi-los. Deve fornecer validação por presença, formato, fingerprint parcial não reversível ou chamadas seguras.

#### Após autorização do primeiro deploy

- implantar Worker de produção em `workers.dev`;
- não tocar em `vipreco.com.br`;
- executar smoke tests em produção;
- provar isolamento entre staging e produção;
- provar que escrita em um ambiente não aparece no outro, usando apenas dados fictícios identificados;
- validar rollback;
- concluir documentação e auditoria adversarial;
- manter PR #11 sem merge até decisão humana.

### 12.2 Onda 3 — segurança (em execução)

Mandato registrado em `docs/governance/PROMPT-CTO_ONDA-3.md`. Escopo:

- grants, RLS, funções, views e Storage;
- autenticação e autorização;
- revisão de `approve_submission()` e recursos dormentes;
- headers, CSP e proteção de borda;
- Turnstile e rate limits;
- anti-spam server-side;
- acessibilidade e identidade ViPreço;
- revisão do comportamento de staging e produção.

### 12.3 Onda 4 — resiliência

- backups;
- restore real;
- RPO e RTO iniciais;
- logs e alertas;
- plano de incidente;
- testes de falha;
- runbooks mínimos.

### 12.4 Trilha de Produto, sem dados reais

Após Onda 2, o CTO pode preparar em branch separada, somente com dados fictícios e após autorização do PMO:

- ledger fiscal e testes sintéticos;
- pipeline de ingestão com fixtures;
- matching e fila de revisão;
- Achados do dia;
- contagem regressiva e timezone;
- remoção de "Atualizados recentemente";
- Open Graph e imagem de compartilhamento;
- gerador de card PNG;
- página "Como funciona".

Não combinar essa trilha com o PR #11.

---

## 13. Especificação funcional do MVP

### Achados do dia

Reenquadrar a seção existente de oportunidades.

Critério funcional:

```text
is_active = true
is_featured = true
observed_at <= now()
valid_until >= now()
```

Ordenar por tempo restante. Mostrar produto, preço, mercado, fonte/data e contagem regressiva. `is_featured` não altera a comparação orgânica.

A foto é opcional. Se exigir migration, Storage ou complexidade desproporcional, o MVP roda sem foto.

### Remoção

Remover "Atualizados recentemente" da interface de usuário. Frescor continua disponível para operação e observabilidade.

### Preservar

- busca de produto;
- mercado habitual em localStorage;
- página "Como funciona";
- aviso visível de staging no ambiente de testes;
- dados demo somente no staging.

### Não construir

- cesta;
- login;
- scanner de QR;
- cashback no app;
- geolocalização;
- notificações;
- perfil completo de mercado;
- IA exposta como feature;
- moderação pública de submissão.

### Distribuição

Open Graph por produto e Achado, com metadados corretos para crawlers. Verificar se a arquitetura atual exige geração no Worker ou pré-renderização. A postagem em grupos é manual no MVP por decisão de escopo, dependências e compliance; não basear a decisão em uma afirmação permanente sobre indisponibilidade de API.

---

## 14. Validação obrigatória do CTO

Nenhuma tarefa é concluída sem evidência.

Base mínima:

```bash
bun run lint
bun run test
bun run build
```

Além disso, conforme a tarefa:

- testes de isolamento;
- migrations reprodutíveis;
- seed fictício idempotente;
- teste de RLS;
- teste de timezone e expiração;
- teste de crawler/OG por user-agent;
- teste de deduplicação fiscal com fixtures;
- nenhum segredo em diff, log ou artefato;
- CI e CodeQL verdes;
- revisão adversarial;
- rollback documentado.

O stack local completo do Supabase permanece **NOT VERIFIED por limitação de memória do host**, a menos que seja comprovado posteriormente. A validação direta em Postgres cobre migrations, RLS, policies e funções, mas não deve ser descrita como reconstrução de todos os serviços Supabase.

---

## 15. Ações proibidas sem novo gate

- alterar DNS;
- apontar `vipreco.com.br`;
- cadastrar dados reais;
- coletar cupons de participantes;
- pagar cashback;
- convidar usuários externos;
- remover staging;
- usar o mesmo banco em staging e produção;
- reutilizar token Cloudflare entre ambientes;
- expor valores de `.env`;
- remover `approve_submission()` sem migration e revisão;
- remover aviso de teste do staging;
- misturar produto com PR #11;
- mexer nos PRs do Dependabot;
- merge automático;
- começar Onda 3 sem fechamento formal da Onda 2.

---

## 16. Os 15 passos originais no quadro

| #   | Passo                                         |                              Estado |
| --- | --------------------------------------------- | ----------------------------------: |
| 1   | Comprar `vipreco.com.br`                      |                                  ✅ |
| 2   | Desconectar e revogar Lovable                 |                                  ✅ |
| 3   | Rotacionar credenciais                        |                                  ✅ |
| 4   | Transformar ambiente atual em staging         |                           🟡 Onda 2 |
| 5   | Criar Supabase e Worker novos para produção   | 🟡 Supabase criado; Worker pendente |
| 6   | Migrations e seeds reproduzíveis              |    🟡 avançado; fechamento pendente |
| 7   | Auditar grants, RLS, funções, views e Storage |                           ⬜ Onda 3 |
| 8   | MFA e GitHub protegido                        |                                  ✅ |
| 9   | CI, scans e aprovação humana                  |                     ✅ gate mantido |
| 10  | Headers, CSP, Turnstile e rate limits         |                           ⬜ Onda 3 |
| 11  | Backup e restore real                         |                           ⬜ Onda 4 |
| 12  | Logs, alertas e plano de incidente            |                           ⬜ Onda 4 |
| 13  | Só então dados reais                          |                          ⛔ Gate R0 |
| 14  | Piloto pequeno em Artemis                     |                           ⛔ Onda 5 |
| 15  | Revisão externa antes da expansão             |                           ⬜ Onda 6 |

---

## 17. Decisão de execução

1. O CTO recebe este plano como nova referência.
2. A Onda 2 foi encerrada: PR #11 mergeado em `main`, ambientes de staging e produção separados e comprovadamente isolados.
3. A única missão executável agora é a Onda 3 (segurança da aplicação, banco e borda), sob mandato registrado em `docs/governance/PROMPT-CTO_ONDA-3.md`.
4. O CTO não inicia Onda 4 ou trilha de produto sem autorização específica do PMO/Founder.
5. Dados reais permanecem bloqueados pelo Gate R0, que depende também do fechamento da Onda 3.
6. Ao final da Onda 3, o CTO entrega um checkpoint humano único; o PMO decide os próximos passos.
