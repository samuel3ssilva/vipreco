# Runbook operacional do piloto Artemis — pós-Gate R0

**Trilha:** Produto e Validação — preparação do Gate R0 (`PLANO-MESTRE.md` §0, §10, §11).
**Status:** pronto para execução quando autorizado. **Não iniciado.**
**Depende de:** aprovação explícita do Gate R0 pelo Founder/PMO (`PLANO-MESTRE.md` §10).

> Este runbook é executável assim que o Gate R0 for aprovado, mas **nada nele foi
> executado para produzi-lo**. Nenhum contato real com comerciante, nenhuma coleta de
> cupom, nenhum pagamento Pix e nenhum cadastro de dado real ocorreu. Todo conteúdo
> abaixo é planejamento — datas, quantidades e critérios ficam definidos agora para que
> o relógio operacional só precise começar a contar no dia em que o Founder/PMO declarar
> o Gate R0 aprovado, não antes.

---

## 1. Duração e sequência

O relógio dos 30 dias operacionais começa no dia da aprovação do Gate R0, não na data
deste documento (`PLANO-MESTRE.md` §11). Orçamento de tempo de referência: **~32 horas
em quatro semanas**, concentradas no Founder.

| Fase   | O quê                                                     | Conteúdo detalhado                 |
| ------ | --------------------------------------------------------- | ---------------------------------- |
| **P0** | Preparação do experimento, sem coleta real                | `PLANO-MESTRE.md` §11 "P0"         |
| **P1** | Spike de NFC-e, até 50 cupons reais em lotes com stop/go  | `PLANO-MESTRE.md` §10, §11 "P1"    |
| **P2** | Primeiro comerciante, piloto de 14 dias, design partner   | `PLANO-MESTRE.md` §11 "P2"         |
| 31–90  | Curva de incentivo com coorte, comerciantes 2–4, campanha | `PLANO-MESTRE.md` §11 "Dias 31–90" |

Este runbook cobre a operação de P0 a P2 e a transição para a janela de 90 dias dos
gates (`PLANO-MESTRE.md` §6). Não redefine escopo, ordem ou critério — apenas
operacionaliza o que já está aprovado.

### P1 — regra de lote

O spike de NFC-e roda em lotes pequenos com decisão stop/go entre cada um
(`PLANO-MESTRE.md` §10 "Estratégia do spike de 50 cupons"):

1. lote inicial pequeno (QR, consulta, parsing, armazenamento);
2. revisão de falhas, segurança e custo antes de seguir;
3. lotes seguintes até 50 cupons, só se os critérios do lote anterior passarem.

50 é a amostra-alvo, não uma licença para coletar tudo de uma vez. Se um lote falhar de
forma não corrigível no playbook, o P1 para e o achado vira decisão binária: caminho
automatizável ou reformulação da tese (`PLANO-MESTRE.md` §11 "P1").

### P2 — piloto de 14 dias

Comerciante único, design partner, R$ 150–200, fora do gate de preço cheio
(`PLANO-MESTRE.md` §11 "P2"):

1. medir descarte de cinco SKUs perecíveis por cinco dias;
2. registrar o corredor de remarcados;
3. publicar Achados;
4. medir resultado com método conservador (margem ou descarte evitado, nunca receita
   bruta — `PLANO-MESTRE.md` §6, G1);
5. apresentar benefício documentado ao comerciante;
6. transferir a rotina de envio para a loja antes de encerrar os 14 dias.

---

## 2. Local do piloto

**Artemis**, bairro de Piracicaba-SP — já definido pelo projeto, não é uma escolha em
aberto. Nenhuma coleta real, contato com comerciante ou envio de material ocorre antes
da aprovação do Gate R0, independentemente de qualquer preparação de material já estar
pronta.

---

## 3. Número máximo de comerciantes

| Janela                       | Máximo/meta                           | Regra                                                                                                    |
| ---------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P2 (primeiros 30 dias)       | **1** comerciante                     | Design partner, com desconto explícito, fora do gate de preço cheio (`PLANO-MESTRE.md` §6, §11 "P2")     |
| G1 — Merchant Pull (90 dias) | **≥ 3** pagando preço cheio, pré-pago | Exclui o design partner e qualquer permuta; renovação após primeiro resultado ≥ 1 (`PLANO-MESTRE.md` §6) |

O preço cheio deve ser definido e congelado antes de assinar o segundo contrato
(`PLANO-MESTRE.md` §6). Não negociar informalmente um terceiro preço "provisório" —
qualquer exceção de preço é decisão do Founder, registrada, não uma prática recorrente.

---

## 4. Número máximo de consumidores

Coorte de **20–25 domicílios adultos**, um registro por domicílio; equipe, lojistas e
funcionários das lojas ficam fora da coorte paga (`PLANO-MESTRE.md` §6, G2 "Receipt
Flywheel"). Janela de referência: 8 semanas, mesma coorte e regras registradas do
início ao fim — a curva de incentivo não pode ser alterada retroativamente
(`PLANO-MESTRE.md` §7).

Antes de abrir a coorte, os itens abaixo precisam estar documentados (não apenas
decididos verbalmente), conforme `PLANO-MESTRE.md` §7:

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
- procedimento para quando o orçamento acabar (ver §8 abaixo).

---

## 5. Funções do Founder

Hoje a equipe é uma pessoa. `PLANO-MESTRE.md` §11 já assume ~32h do Founder nos
primeiros 30 dias; G3 (`PLANO-MESTRE.md` §6) é o gate que mede especificamente quando
essa dependência deixa de ser necessária (**≥ 4 semanas sem hora de campo do Founder**,
com o Founder podendo seguir em gestão, não em coleta presencial).

| Função                                                                        | Pode ser delegada em P0–P2? | Quando passa a poder ser delegada                                                                                                                     |
| ----------------------------------------------------------------------------- | :-------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operar o número de WhatsApp (receber foto/áudio do lojista)                   |             Não             | Após playbook validado e G3 medir semanas sem hora de campo (`PLANO-MESTRE.md` §6, G3)                                                                |
| Validar cupom no canal concierge (conferir chave, duplicidade, elegibilidade) |             Não             | Só quando existir segunda pessoa treinada no playbook de fraude (§9) e auditoria amostral cobrindo o trabalho dela                                    |
| Pagamento Pix ao participante                                                 |             Não             | Fica com quem tem acesso à conta/credencial de pagamento — hoje só o Founder (`PLANO-MESTRE.md` §0, "gates humanos permanentes": custos e pagamentos) |
| Atendimento a dúvida simples (horário, como enviar cupom)                     | Parcialmente, com playbook  | Pode ir para o coletor pago (`PLANO-MESTRE.md` §4.4) assim que o playbook de atendimento (§10) estiver testado                                        |
| Apoio presencial ao comerciante no período inicial                            |             Não             | Reduz conforme a rotina do comerciante se sustenta sozinha (§6) — meta é o comerciante operar sem visita                                              |
| Decisão de pausar ou encerrar o piloto (§12, §13)                             |             Não             | Permanece decisão do Founder/PMO em qualquer estágio — não é uma função operacional a delegar                                                         |

Regra geral: nada que envolva credencial, pagamento ou decisão de gate é delegável
antes do Gate R0 nem durante P0–P2. O que é delegável é execução repetitiva já coberta
por playbook (lembretes, coleta assistida, triagem de dúvida simples) — e mesmo isso
só depois de auditoria amostral confirmar que o playbook está sendo seguido.

---

## 6. Rotina do comerciante

**Risco identificado no plano oficial:** a rotina morre quando é delegada
(`PLANO-MESTRE.md` §4.1). **Defesa:** lembrete padrão em horário fixo, playbook
simples, apoio presencial apenas no período inicial.

Operacionalização:

1. **Lembrete padrão, horário fixo.** Uma mensagem curta enviada sempre no mesmo
   horário (referência: início da manhã, alinhado ao fluxo "Mercado manda foto do
   remarcado pelo WhatsApp, pela manhã" — `PLANO-MESTRE.md` §3). O horário exato é
   combinado com o comerciante no onboarding e não muda sem avisar.
2. **Conteúdo do envio.** Foto ou áudio curto de um remarcado que já existiria na
   rotina da loja — nada que exija dashboard, formulário ou integração de caixa
   (`PLANO-MESTRE.md` §4.1).
3. **Playbook simples.** Um roteiro de uma página para o comerciante: o que fotografar,
   o que dizer no áudio, o que acontece depois do envio. Sem jargão técnico.
4. **Apoio presencial só no início.** Visita nos primeiros dias do P2 para ensinar a
   rotina ao vivo; a meta explícita é que o comerciante consiga sustentar a rotina sem
   visita — isso é o que G1 mede como "remarcações sem cobrança manual" (**≥ 70%**
   recebidas até o horário combinado usando no máximo o lembrete padrão, sem ligação,
   visita ou mensagem manual adicional — `PLANO-MESTRE.md` §6, G1).
5. **Se a rotina não pegar.** Registrar como achado de P2 (não como fracasso do
   comerciante) e ajustar o playbook antes de repetir com o comerciante 2. Duas
   tentativas de ajuste sem sucesso é sinal para revisar a peça operacional inteira
   (mesmo espírito do kill criteria de G1, `PLANO-MESTRE.md` §6).

---

## 7. Atendimento por WhatsApp

Canal concierge — não é o app, é o WhatsApp da operação (`PLANO-MESTRE.md` §4.1, §4.3).
Dois fluxos de entrada:

### 7.1 Fluxo do lojista

1. Lojista recebe o lembrete padrão no horário combinado (§6).
2. Lojista responde com foto ou áudio do remarcado.
3. Founder (ou quem estiver operando o canal, ver §5) confirma recebimento com uma
   mensagem curta padronizada.
4. Material entra no pipeline de ingestão (`PLANO-MESTRE.md` §4.2) para virar Achado.
5. Se o material não tiver informação suficiente (produto, preço ou mercado
   ambíguos), o Founder responde pedindo o complemento específico — nunca inventa o
   dado faltante para não violar identidade exata de produto (`CLAUDE.md`, princípio 1).

### 7.2 Fluxo do participante (consumidor da coorte)

1. Participante identificado e registrado na coorte (§4) recebe as instruções do
   protocolo do experimento (elegibilidade, como enviar cupom, prazo).
2. Participante compra na loja ao preço de gôndola — sem código, sem desconto no caixa
   (`PLANO-MESTRE.md` §3, §4.3).
3. Participante envia o cupom fiscal (NFC-e) pelo canal concierge.
4. Equipe valida a chave, checa duplicidade e elegibilidade (§9).
5. Se elegível, participante recebe confirmação e, após a janela de verificação (§9),
   o Pix.
6. Se inelegível ou inválido, participante recebe explicação objetiva do motivo
   (chave duplicada, fora da janela, mercado não elegível etc.), sem promessa de
   reanálise fora do critério documentado em §4.

### 7.3 Tempo de resposta

Ver §10 (Suporte) — o mesmo compromisso de tempo de resposta vale para os dois fluxos
acima.

---

## 8. Conciliação de cashback

Curva de incentivo definida em `PLANO-MESTRE.md` §4.3: **R$ 5 → R$ 2 → R$ 1 → somente
patrocinado**, dentro do teto do experimento inteiro de **R$ 1.000**
(`PLANO-MESTRE.md` §3, §7). A curva não pode ser alterada retroativamente; qualquer
exceção precisa ser registrada (`PLANO-MESTRE.md` §7).

### 8.1 Conciliação operacional

1. Cada Pix pago é registrado contra: domicílio da coorte, chave fiscal (tratada
   conforme `PLANO-MESTRE.md` §9, deduplicação fiscal — nunca reter a chave bruta além
   da janela de validação), valor pago, degrau da curva no momento do pagamento.
2. Saldo do orçamento é conferido antes de cada lote de pagamento — não depois. O
   hard stop é automático ou operacional ao atingir R$ 1.000 (`PLANO-MESTRE.md` §7).
3. Reserva de fraude e taxas de processamento fazem parte da mesma conta do teto — não
   é um orçamento separado que estica o limite.

### 8.2 Quando o orçamento acabar

Este procedimento precisa estar documentado **antes** de abrir a coorte
(`PLANO-MESTRE.md` §7, item "procedimento quando o orçamento acabar"). Regra padrão
proposta aqui, para decisão final do Founder no Gate R0:

1. Ao atingir o teto, nenhum novo cupom é pago em dinheiro — a curva já prevê o degrau
   final "somente patrocinado" (`PLANO-MESTRE.md` §4.3); se esse degrau ainda não
   estiver ativo, o piloto pausa novos pagamentos e não inicia novos participantes.
2. Comunicar à coorte ativa, de forma simples, que o experimento atingiu o limite de
   orçamento e qual é o próximo passo (encerramento do ciclo de pagamento ou transição
   para patrocínio, conforme decisão do Founder).
3. Cupons já enviados e pendentes de validação até o momento do estouro são honrados
   se dentro da janela de verificação (§9); cupons enviados depois do hard stop não
   geram novo pagamento em dinheiro.
4. Registrar o encerramento do orçamento como evento (data, valor total pago, número
   de domicílios atendidos) — vira insumo direto para G4 (Unit Economics,
   `PLANO-MESTRE.md` §6).

---

## 9. Tratamento de fraude

A defesa técnica (deduplicação por chave fiscal protegida, limites por pessoa/
domicílio/dispositivo, retenção mínima da chave bruta) é a proposta de arquitetura em
`docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md` — este runbook não duplica esse desenho,
só cobre o que o Founder faz manualmente no dia a dia do piloto.

### 9.1 O que o Founder faz manualmente

1. **Antes de pagar:** confirmar que a chave fiscal não gerou benefício antes em toda a
   plataforma (`PLANO-MESTRE.md` §9, "Deduplicação fiscal e retenção") e que o cupom
   está dentro da janela de elegibilidade da coorte (loja, produto, data).
2. **Sinal de suspeita:** cupons do mesmo domicílio em volume acima do combinado,
   cupons de lojas fora da lista elegível, cupons com padrão visual inconsistente
   (foto/print em vez de leitura direta, quando aplicável), participante pedindo
   reanálise repetida fora do critério documentado.
3. **Critério de bloqueio:** qualquer sinal de §9.1.2 confirmado (não apenas suspeito)
   pausa o pagamento daquele cupom especificamente — nunca um bloqueio retroativo de
   pagamentos já feitos sem nova evidência. O domicílio permanece na coorte até decisão
   explícita de exclusão pelo Founder; exclusão não é automática por um único cupom
   suspeito.
4. **Janela de verificação antes do pagamento:** nenhum Pix sai no mesmo instante do
   envio do cupom. Existe uma janela mínima de checagem (cancelamento de nota,
   duplicidade, elegibilidade) antes da liberação — consistente com
   `PLANO-MESTRE.md` §9 ("janela de verificação de cancelamento antes do pagamento").
   O tamanho exato da janela é parametrizado no protocolo do experimento (§4 acima),
   não fixado aqui.
5. **Fraude confirmada:** registrar o caso (o que aconteceu, como foi identificado, o
   que foi feito), não pagar, e considerar se o padrão exige ajuste no critério de
   elegibilidade da coorte inteira — isso alimenta tanto G2 ("chaves duplicadas
   aceitas: 0", `PLANO-MESTRE.md` §6) quanto a reserva de fraude de G4
   (`PLANO-MESTRE.md` §6).

---

## 10. Suporte

Equipe de uma pessoa — mesmo espírito minimalista de
`docs/operations/INCIDENT-RESPONSE-PLAN.md` §1 (papéis) e §6 (o que este estágio
deliberadamente não cobre ainda).

| Quem pede ajuda | Canal                              | Tempo de resposta esperado                                                                                                |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Participante    | WhatsApp concierge (§7.2)          | Mesma janela útil do dia; sem SLA formal — equipe de uma pessoa, sem plantão noturno                                      |
| Comerciante     | WhatsApp (lembrete/resposta, §7.1) | Mesma janela útil do dia, prioridade sobre dúvida de participante durante o P2 (comerciante único, crítico para o piloto) |

Não existe SLA contratual no piloto — é o mesmo motivo já registrado em
`docs/operations/INCIDENT-RESPONSE-PLAN.md` §6 ("SLA formal — não existe contrato pago
ainda" se referindo à infraestrutura; aqui vale o equivalente para atendimento humano).
Quando a coorte ou o número de comerciantes crescer além do que uma pessoa sustenta,
isso é, por definição, o sinal de G3 (`PLANO-MESTRE.md` §6) para redesenhar o
atendimento com apoio do coletor pago ou de terceiro treinado — não um problema a
resolver com mais horas do Founder.

---

## 11. Incidentes

Processo técnico geral (severidade, detecção, resposta, comunicação, postmortem):
`docs/operations/INCIDENT-RESPONSE-PLAN.md`. Este runbook não duplica aquele processo —
só cobre o que é específico da operação do piloto e não está coberto lá porque aquele
documento foi escrito antes de haver dado real ou participante.

| Cenário específico do piloto                                                       | O que fazer                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pix pago para a pessoa ou valor errado                                             | Founder contata o participante pelo mesmo canal, explica o erro, corrige (estorno ou complemento) o mais rápido possível; registrar o caso e o valor fora da curva de incentivo padrão em nota separada, sem afetar a contagem do degrau vigente                                                                                                       |
| Dado de participante exposto (ex: número, cupom, ou valor pago visível a terceiro) | Tratar como incidente de dado pessoal: identificar o alcance real (quem viu, por quanto tempo), conter (remover a exposição), avisar o participante afetado, registrar causa raiz — segue a mesma disciplina de severidade e postmortem de `docs/operations/INCIDENT-RESPONSE-PLAN.md` §2 e §4, adaptada para dado de pessoa em vez de dado de sistema |
| Comerciante recebe Achado com preço ou produto errado publicado                    | Corrigir a publicação imediatamente, avisar o comerciante, verificar se o erro veio do pipeline de ingestão (ajuste técnico) ou de leitura humana equivocada (ajuste de playbook)                                                                                                                                                                      |
| Suspeita de fraude não resolvida no prazo da janela de verificação                 | Não pagar até resolver; se não resolver dentro de um prazo razoável, tratar como critério de pausa (§12), não como bloqueio silencioso indefinido                                                                                                                                                                                                      |

Quando o piloto tiver comerciante e participante reais, a lacuna já registrada em
`docs/operations/INCIDENT-RESPONSE-PLAN.md` §5 ("comunicação externa — item a
revisitar antes do Gate R0") passa a ser coberta por este runbook (§7, §10 e a tabela
acima) em vez de ficar em aberto.

---

## 12. Critérios de pausa

Pausar o piloto significa parar de coletar cupom, pagar Pix ou abrir novo comerciante
temporariamente, sem declarar encerramento (§13) nem acionar o kill criteria oficial.
Retomar exige que a causa da pausa esteja resolvida e documentada.

- orçamento (§8) próximo do teto de R$ 1.000 antes de a curva de incentivo já ter
  chegado ao degrau "somente patrocinado";
- taxa de erro do parsing automático caindo visivelmente abaixo da meta de G2
  (**≥ 95%**, `PLANO-MESTRE.md` §6) em amostra auditada, antes mesmo do fim da janela
  de 8 semanas;
- suspeita de fraude levantada em §9 e não resolvida dentro do prazo esperado;
- exceções especializadas no matching acima da meta de G3 (**< 10%**,
  `PLANO-MESTRE.md` §6) de forma sustentada, não pontual;
- qualquer achado de segurança ou privacidade que exija correção antes de continuar
  expondo participante ou comerciante a risco adicional;
- indisponibilidade do canal de atendimento (Founder indisponível) por período que
  comprometa a janela de verificação de pagamento (§9).

---

## 13. Critérios de encerramento

Kill criteria oficial, sem reinterpretação (`PLANO-MESTRE.md` §6, "Kill criteria"):

- **falha em G2 ou G4 após dois ciclos de ajuste:** encerrar ou reformular a tese
  antes de escalar;
- **falha em G1 ou G3:** redesenhar operação, proposta e playbook;
- nenhuma métrica pode ser reinterpretada depois do início do ciclo.

Este runbook não adiciona nenhum critério de encerramento além do que já está aprovado
em `PLANO-MESTRE.md` §6 — a decisão de encerrar continua sendo do Founder/PMO.

---

## 14. Métricas de sucesso

Não redefinidas aqui — citação direta das fontes oficiais.

**As quatro perguntas que Artemis testa** (`PLANO-MESTRE.md` §4, "O que Artemis
testa"):

1. O comerciante alimenta a rotina com no máximo o lembrete padrão?
2. O consumidor envia novamente um cupom com incentivo decrescente?
3. Um terceiro opera a rotina sem hora de campo do Founder?
4. Uma campanha patrocinada fecha a conta economicamente?

**Métricas objetivas dos gates de 90 dias:** tabela completa em `PLANO-MESTRE.md` §6
(G1 — Merchant Pull, G2 — Receipt Flywheel, G3 — Operating Leverage, G4 — Unit
Economics). Este runbook aponta para essa tabela em vez de reproduzi-la, para evitar
duas fontes divergentes sobre a mesma meta.

---

## 15. Orçamento — ainda não aprovado

Nenhum orçamento foi aprovado por este documento. O teto de **R$ 1.000** é o teto
**máximo** já definido por `PLANO-MESTRE.md` §7 para o experimento inteiro — não é uma
autorização de gasto. A liberação efetiva de qualquer valor (mesmo dentro do teto) é
decisão do Founder no momento do Gate R0, item por item, conforme os "gates humanos
permanentes" (`PLANO-MESTRE.md` §0): custos, planos e pagamentos exigem autorização ou
execução direta do Founder. Este runbook prepara o procedimento; não gasta, reserva ou
compromete nenhum valor.

---

## 16. Dependências humanas e jurídicas

Checklist completo de pré-requisitos do Gate R0 (ambiente, privacidade, consentimento,
jurídico, aprovação do Founder): `docs/r0/R0-READINESS-MATRIX.md` — não duplicado aqui.
Este runbook assume que a matriz de prontidão está com status "pronto" antes do relógio
de 30 dias (§1) começar a contar.

Ver também `PLANO-MESTRE.md` §10 ("Gate R0 — antes de qualquer dado real") para a lista
oficial de dependências obrigatórias que a matriz de prontidão detalha.
