# Kit de entrevistas com mercados — B2B-1

**Registrado em 2026-08-06.** **NORMATIVO** como procedimento de campo.
Subordinado ao `PLANO-MESTRE.md` §11 e ao card **MVP-BUSINESS-01**.

> ## NENHUMA ENTREVISTA FOI REALIZADA
>
> Este kit é material escrito, e só isso. Nenhum mercado foi contatado, nenhuma mensagem foi
> enviada, nenhum dado pessoal foi coletado, nenhum compromisso comercial foi assumido.
>
> **Contato com pessoa real exige autorização específica do Founder** — é gate próprio, e ele
> continua fechado. Escrever o roteiro é trabalho do CTO; ir a campo é decisão do Founder.
> Registro em [`../../pmo/MVP-DECISION-LOG.md`](../../pmo/MVP-DECISION-LOG.md) DL-031.

---

## Por que o material vem antes da conversa

O aceite de MVP-BUSINESS-01 sempre exigiu essa ordem: _"plano de delegação escrito **antes**
de qualquer contato"_. Não é burocracia.

Material improvisado na véspera de uma conversa é material que promete o que não existe. Um
lojista pergunta "quantas pessoas usam isso?" e, sem uma resposta escrita e combinada antes,
quem está na frente dele inventa uma. Depois disso o piloto começa devendo.

O segundo motivo é medir. Cinco conversas com perguntas diferentes produzem cinco anedotas;
cinco conversas com o mesmo roteiro produzem um padrão — e é o padrão que decide o que R6 e
R7 precisam construir.

---

## O que tem aqui

| Arquivo                                            | O que é                                                        |
| -------------------------------------------------- | -------------------------------------------------------------- |
| [`HYPOTHESES.md`](./HYPOTHESES.md)                 | as dez hipóteses, cada uma com o que a confirma e o que a nega |
| [`INTERVIEW-SCRIPT.md`](./INTERVIEW-SCRIPT.md)     | o roteiro de 20 a 30 minutos, nove blocos                      |
| [`PITCHES.md`](./PITCHES.md)                       | 30 segundos, 2 minutos e 5 minutos                             |
| [`INTERVIEW-SHEET.md`](./INTERVIEW-SHEET.md)       | a folha a preencher durante e logo depois                      |
| [`SIGNAL-CRITERIA.md`](./SIGNAL-CRITERIA.md)       | o que é sinal forte, moderado e fraco — decidido **antes**     |
| [`SYNTHESIS-TEMPLATE.md`](./SYNTHESIS-TEMPLATE.md) | como consolidar as conversas em decisão                        |
| [`offline/`](./offline/)                           | o material que funciona sem internet                           |

---

## A ordem de uso

1. **Antes de marcar**: ler as hipóteses e os critérios de sinal. Quem entra numa conversa sem
   saber o que conta como "sim" volta com a impressão de que foi bem.
2. **Ao abordar**: pitch de 30 segundos. Ele existe para conseguir os 20 minutos, não para
   convencer de nada.
3. **Na conversa**: roteiro, com a folha aberta ao lado. O material offline entra no bloco 6,
   e não antes — mostrar a tela cedo demais transforma a entrevista em demonstração, e a
   pessoa passa a reagir ao desenho em vez de contar como ela trabalha.
4. **Nos 10 minutos seguintes**: fechar a folha. Memória de entrevista dura menos do que
   parece, e o que se perde primeiro é justamente a frase textual que valia ouro.
5. **Depois de todas**: template de síntese.

---

## Cinco regras que não dependem de quem está conduzindo

**1. Não perguntar se a pessoa gostou.** "Gostou?" tem uma resposta educada e ela não
informa nada. As perguntas do roteiro são sobre o que a pessoa **faz** hoje — e o que alguém
faz é verificável, enquanto o que alguém acha, não.

**2. Nenhum compromisso comercial.** Nem preço, nem exclusividade, nem posição, nem data de
publicação. Se surgir a pergunta, a resposta é: "isso é uma decisão que ainda não foi tomada,
e é uma das coisas que estou aqui para entender."

**3. Nenhuma promessa de ranking.** Participar do ViPreço **não compra posição**. Isso é dito
na conversa, está escrito no material, e é regra inviolável do produto — não uma política que
possa ser revista para fechar um piloto.

**4. Dado pessoal só o necessário.** Nome do mercado, papel de quem falou, e um contato **se
a pessoa oferecer** e consentir. Sem CPF, sem endereço residencial, sem foto, sem gravação
sem consentimento explícito. A folha de entrevista tem exatamente esses campos, e não mais.

**5. Nenhum preço real é coletado nesta fase.** A entrevista pergunta **como** o mercado
comunica preço; ela não recolhe preço. Cadastrar dado real continua bloqueado até os Gates.

---

## O que o kit deliberadamente não tem

- **QR Code.** **Existe desde 06/08/2026**, e aponta para a demonstração em **staging**, não
  para produção: `qr-demo-staging.png` e `.svg`, em [`offline/`](./offline/). Autorizado pelo
  Founder para **entrevistas privadas**, com a legenda "Demonstração — ambiente de teste do
  ViPreço". O endereço público definitivo continua sendo de R8, e o QR será trocado lá —
  dizer isso na conversa é parte do roteiro, não uma ressalva.

  O símbolo é gerado por `scripts/qr/`, código próprio e testado, e foi **lido por um
  decodificador independente** antes de entrar aqui. Não é detalhe: a primeira versão do
  codificador produziu três símbolos de aparência impecável e ilegíveis. Para regerar:
  `bun scripts/qr/gerar-demo-staging.ts`.

- **Contrato, proposta comercial ou tabela de preço.** B2B-3 e adiante.
- **Número de usuários, tráfego ou métrica de resultado.** Não existem, e material que os
  cita passa a ser ficção.
- **Logotipo de mercado.** Nenhum direito de uso foi obtido para nenhum.

---

## Documentos relacionados

- [`../../product/ROADMAP-MVP-V2.md`](../../product/ROADMAP-MVP-V2.md) §4 — a trilha B2B
- [`../../pmo/TRELLO-MAPPING.md`](../../pmo/TRELLO-MAPPING.md) — MVP-BUSINESS-01 e o checklist
- [`../../mvp/FOR-MARKETS-PAGE.md`](../../mvp/FOR-MARKETS-PAGE.md) — a rota `/para-mercados`
- [`../../mvp/TEST-MVP-PLAN.md`](../../mvp/TEST-MVP-PLAN.md) — Gate V2
