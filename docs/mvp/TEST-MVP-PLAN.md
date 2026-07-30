# Plano do Teste MVP asset-light (Roadmap A)

**Decisão estratégica do Founder/PMO (2026-07-30):** validar o produto com o menor
investimento possível antes do Gate R0 completo. Este plano cobre a sequência A1-A6 do
Roadmap A registrado em `PLANO-MESTRE.md` §12.4.

**O que este documento autoriza e o que não autoriza:** este plano descreve a sequência
inteira (A1 a A6), mas **só A1 e A2 estão sendo executados nesta rodada** — produto
demonstrável com dados sintéticos e operação manual documentada. A3 (teste fechado de
usabilidade) e A4 (teste local sem cashback) envolvem, em algum grau, contato com pessoas
reais e exigem autorização específica do Founder quando chegar a hora — nenhum contato
com consumidor ou comerciante real foi feito para produzir este plano ou o código desta
rodada.

---

## 1. Hipóteses a testar

| #   | Hipótese                                                                                                                             | Como é testada                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Um consumidor entende a proposta de valor do ViPreço (comparação de preço com procedência) em poucos segundos, olhando só a home     | Gate V0 — avaliação crítica interna do produto demonstrável (Frente 8/9 desta rodada)                                                                     |
| H2  | Um consumidor confia no dado mostrado (preço + mercado + data juntos) mesmo sabendo que é uma demonstração                           | Gate V0 — mesma avaliação crítica, com dados sintéticos claramente identificados como demo                                                                |
| H3  | Um dono de mercado entende a proposta e considera plausível participar, sem precisar de integração com PDV                           | Gate V0 — avaliação crítica da rota `/para-mercados`                                                                                                      |
| H4  | A operação manual (planilha/checklist + WhatsApp) é suficiente para publicar uma oferta em poucos minutos, sem painel administrativo | Gate V1 — teste fechado de usabilidade (pessoas reais avaliando o protótipo, dados ainda sintéticos, sem contato externo com consumidor/comerciante real) |
| H5  | Um comerciante real consegue enviar uma oferta pelo canal manual (WhatsApp) sem apoio técnico presencial contínuo                    | Gate V2 — teste local com **um** comerciante real, sem cashback, mediante autorização específica do Founder para esse contato                             |
| H6  | Um consumidor real age sobre uma oferta real publicada, mesmo sem incentivo de cashback                                              | Gate V2 — mesmo teste local, mediante autorização específica do Founder                                                                                   |

## 2. Público

- **Gate V0 (esta rodada):** nenhum público externo — avaliação crítica interna (três
  perspectivas: consumidor comum, dono de mercado, designer de produto exigente),
  descrita na Frente 8/9 desta rodada. Nenhum contato com pessoa real.
- **Gate V1 (futuro, exige autorização específica):** um pequeno grupo fechado (amigos,
  conhecidos ou testadores recrutados pelo Founder) avaliando o protótipo com dados
  sintéticos — ainda não é o público-alvo real do produto, é teste de usabilidade.
- **Gate V2 (futuro, exige autorização específica):** um comerciante real do bairro
  Artemis (design partner, sem cobrança) e uma pequena vizinhança de consumidores reais
  ao redor dele — sem cashback, sem coleta de dado sensível, sem NFC-e/Pix.

## 3. Escopo

**Dentro do escopo desta rodada (A1 + A2):**

- produto demonstrável com dados sintéticos (home/Achados, busca, produto, como
  funciona);
- rota de apresentação para dono de mercado (`/para-mercados`);
- ativação do Brand System v2 já instalado e com contraste verificado
  (`docs/design/BRAND-V2-CONTRAST-RECALC.md`);
- operação manual documentada (`docs/mvp/MANUAL-OFFER-OPERATIONS.md`);
- avaliação crítica e evidências de qualidade (screenshots, checagem mobile/desktop,
  acessibilidade básica).

**Fora do escopo desta rodada (A3-A6, futuro):**

- qualquer contato real com consumidor ou comerciante;
- qualquer coleta de dado real;
- qualquer publicação de oferta real;
- campanha concierge (A5);
- decisão final GO/AJUSTAR/NO-GO (A6) — só pode acontecer depois de V1 e V2 terem
  resultado.

## 4. Exclusões permanentes deste teste (não fazem parte do Roadmap A em nenhuma fase)

Login de consumidor, cashback, Pix, NFC-e, scanner de QR, geolocalização, notificações,
painel administrativo completo, integração com PDV, CRM, automação de WhatsApp,
moderação pública de submissão — todos permanecem no Roadmap B
(`docs/strategy/POST-VALIDATION-PARKING-LOT.md`), sem exceção.

## 5. Entregáveis desta rodada

1. Produto público refinado — home/Achados, busca, produto, como funciona — com o Brand
   System v2 ativado (PR B);
2. Rota `/para-mercados` (PR C);
3. `docs/mvp/MANUAL-OFFER-OPERATIONS.md` (PR C);
4. Avaliação crítica de três perspectivas + correções + evidências visuais (PR D);
5. Este plano e o índice de estacionamento do Gate R0 (PR A, documental).

## 6. Métricas

**Gate V0 (esta rodada — qualitativo, sem usuário real):**

- as 17 dimensões da auditoria (Frente 3) sem nenhum item crítico aberto;
- avaliação crítica de três perspectivas sem bloqueador não resolvido;
- lint/test/build/CodeQL verdes; nenhuma regressão de acessibilidade ou de segurança
  (nenhuma superfície pública de escrita reaberta).

**Gate V1 (futuro — teste fechado de usabilidade):**

- taxa de conclusão da tarefa "encontre e explique por que um Achado é mais barato" sem
  ajuda;
- tempo até a pessoa entender a proposta de valor, medido de forma informal (poucos
  segundos vs. minutos);
- número de pontos de confusão relatados.

**Gate V2 (futuro — teste local sem cashback):**

- o comerciante consegue enviar ao menos 3 ofertas em 2 semanas usando só o canal manual;
- ao menos 1 evidência qualitativa de que um consumidor real visitou a loja por causa de
  um Achado (sem instrumentação de rastreamento — relato direto);
- nenhum incidente de dado ou reclamação não tratada.

## 7. Gates

- **Gate V0 — pronto para avaliação interna.** Critério: os quatro PRs de implementação
  (B, C, D) abertos, verdes, com evidência visual e avaliação crítica registrada. Decisão:
  Founder revisa e autoriza (ou não) avançar para V1. **Não autoriza contato externo.**
- **Gate V1 — pronto para teste fechado de usabilidade.** Critério: Gate V0 aprovado pelo
  Founder + autorização específica para recrutar um pequeno grupo fechado. Decisão:
  GO (avançar para V2) / AJUSTAR (repetir V1 com correções) / NO-GO (parar aqui).
- **Gate V2 — pronto para teste local sem cashback.** Critério: Gate V1 com GO +
  autorização específica do Founder para contato com um comerciante e uma vizinhança
  reais. Decisão: GO (considerar avançar para o Roadmap B) / AJUSTAR / NO-GO.

## 8. Critérios de GO / AJUSTAR / NO-GO (aplicados a cada gate)

- **GO:** a hipótese do gate foi confirmada sem ajuste estrutural necessário.
- **AJUSTAR:** a hipótese foi parcialmente confirmada; um ajuste específico e pequeno
  (copy, layout, fluxo) resolveria o problema — repetir o mesmo gate após o ajuste, não
  avançar direto.
- **NO-GO:** a hipótese foi refutada de forma que exigiria redesenho estrutural do
  produto — parar e reavaliar a tese antes de continuar, sem avançar de gate.

## 9. Estimativa de esforço

- **Gate V0 (esta rodada):** já em execução, sem custo (código e documentação em branch,
  sem deploy, sem serviço pago).
- **Gate V1 (futuro):** baixo esforço — recrutamento informal, sem infraestrutura nova;
  ordem de poucas horas do Founder.
- **Gate V2 (futuro):** esforço moderado — depende de encontrar e convencer um
  comerciante design partner; consistente com a estimativa já registrada em
  `PLANO-MESTRE.md` §11 para P2 (piloto de 14 dias por R$ 150-200, fora do escopo de
  custo desta rodada e sujeito a autorização própria).

## 10. Riscos

- **Confundir dado sintético com dado real** — mitigado pelo banner de demonstração
  obrigatório em toda tela com dado sintético (Frente 7).
- **Prometer algo que o produto não entrega** (ex.: "menor preço garantido") — mitigado
  pela revisão de microcopy na Frente 8/9, alinhada a `PLANO-MESTRE.md` §9.
  Neutralidade.
- **Avançar de gate sem sinal real** — mitigado pelos critérios objetivos de GO/AJUSTAR/
  NO-GO acima; nenhum gate avança automaticamente.
- **Construir estrutura que muda depois do teste** — mitigado pelo princípio obrigatório
  #12 desta rodada: não construir agora o que provavelmente mudará (ex.: nenhum painel
  administrativo, nenhuma automação de WhatsApp).

## 11. Limites do teste

- Nenhum dado pessoal real em nenhuma fase até V2, e mesmo em V2 sem cashback, Pix ou
  NFC-e.
- Nenhuma alegação de "menor preço garantido" em nenhuma tela.
- Nenhuma nova superfície pública de escrita — toda oferta entra pelo canal manual
  operado pelo Founder (`docs/mvp/MANUAL-OFFER-OPERATIONS.md`).
- Produção permanece vazia e o domínio `vipreco.com.br` permanece sem apontamento durante
  todo o Gate V0.
- Nenhuma fase deste plano autoriza, por si só, a Onda 5 ou o Gate R0 completo — esses
  continuam exigindo o processo próprio já registrado em `PLANO-MESTRE.md` §10.
