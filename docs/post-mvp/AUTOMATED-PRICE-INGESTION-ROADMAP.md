# Automação complementar de ingestão de preços — trilha pós-MVP

**Status: NORMATIVO como registro de intenção. NÃO É ESCOPO DO MVP.**

> **Nada nesta trilha está autorizado.** Não pode começar nenhuma linha de código, nenhum
> conector, nenhuma coleta, nenhuma investigação técnica nova e nenhuma infraestrutura
> preventiva. Este documento registra o desenho para que a decisão futura seja tomada sobre
> algo escrito, não sobre uma conversa.

> **Sobre investigações anteriores:** o Founder/PMO relata que dois estudos foram produzidos
> antes desta fase. Eles **não foram localizados** nesta missão e seus achados **não foram
> verificados** — ver [`SOURCE-CONNECTOR-STATUS.md`](SOURCE-CONNECTOR-STATUS.md) §4. A frase
> acima proíbe começar investigação **nova**; ela não afirma que investigação anterior nunca
> existiu.

Quatro afirmações que valem para tudo o que vem abaixo:

1. **não faz parte do MVP;**
2. **não bloqueia o MVP** — o MVP fecha inteiro sem nada disto;
3. **não pode começar autonomamente** — nem investigação, nem spike, nem protótipo;
4. **depende de Gate humano** do Founder e do PMO, em cada etapa;
5. **nenhuma investigação autoriza publicação** — descobrir que uma fonte é acessível não
   autoriza usá-la;
6. **nenhum preço coletado entra no produto nesta fase.**

---

## 1. Motivação

Classificada como **[F] — contexto fornecido pelo Founder**, não evidência quantitativa.
Registrar a origem importa: quando o Gate de necessidade (§3) for avaliado, ele será avaliado
contra dado medido, não contra estas duas frases.

- **[F]** Artemis isoladamente pode não produzir volume suficiente para manter comparações
  úteis. Um comparador com um preço por produto não é um comparador.
- **[F]** Moradores de Artemis também realizam compras em redes próximas, incluindo Atacadão,
  Savegnago, Pague Menos e São Vicente.

Nenhuma das duas foi medida. As duas são hipóteses plausíveis do Founder sobre o mercado, e é
exatamente por isso que a trilha começa por medir (PM-DATA-0), não por construir.

**[F]** O Founder/PMO relata também que dois estudos técnicos anteriores sobre fontes foram
produzidos — um plano sobre Pague Menos, São Vicente e Carrefour, e uma investigação
complementar sobre Savegnago e Atacadão. Esses relatórios **não foram localizados** nesta
missão e seus achados **não foram verificados**; o registro completo, com os caminhos
inspecionados, está em [`SOURCE-CONNECTOR-STATUS.md`](SOURCE-CONNECTOR-STATUS.md) §4.

Isso muda o ponto de partida de PM-DATA-1, não o desenho da trilha: **os relatórios anteriores
devem ser localizados, versionados ou substituídos por evidência reproduzível antes de
qualquer spike pós-MVP.** Um estudo que ninguém consegue abrir não sustenta um Gate.

---

## 2. Sequência

Cada etapa termina em Gate humano. Nenhuma começa antes que a anterior tenha sido aprovada.

| #             | Etapa                                   | O que entrega                                                                                               | Termina em                        |
| ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **PM-DATA-0** | Gate de necessidade e prontidão         | medida do déficit de cobertura e checagem das dependências de §4                                            | decisão do PMO: seguir ou parar   |
| **PM-DATA-1** | Evidências e revisão jurídica           | localização dos estudos anteriores, inventário das fontes candidatas, termos de uso lidos, parecer jurídico | autorização por fonte, ou HOLD    |
| **PM-DATA-2** | Primeira fonte em shadow mode           | um conector que coleta e **não publica nada**                                                               | amostra auditável                 |
| **PM-DATA-3** | Validação humana e precisão             | auditoria da amostra contra as 14 dimensões de §6                                                           | precisão composta medida          |
| **PM-DATA-4** | Publicação limitada                     | um subconjunto pequeno publicado com procedência de conector                                                | reavaliação após período definido |
| **PM-DATA-5** | Segundo conector                        | prova de que o contrato de conector generaliza                                                              | idem                              |
| **PM-DATA-6** | Recorrência, observabilidade e operação | agendamento, alerta, fila de revisão, runbook                                                               | operação sustentável              |
| **PM-DATA-7** | Santa Terezinha e expansão Piracicaba   | avaliação de cobertura fora de Artemis                                                                      | decisão de expansão               |

**Nenhuma etapa autoriza a seguinte.** Passar de PM-DATA-2 para PM-DATA-3 é decisão humana,
mesmo que a coleta tenha funcionado perfeitamente.

---

## 3. Gate de necessidade

A hipótese, escrita de forma mensurável:

> A automação será considerada quando o processo manual e as contribuições dos mercados **não
> conseguirem** manter cobertura suficiente de produtos canônicos com preços vigentes em dois
> ou mais mercados.

**Referência inicial do piloto: 20 produtos comparáveis.** É referência, não regra permanente
— serve para dar ordem de grandeza à conversa enquanto não há dado. O limiar definitivo
depende de dados reais e de aprovação do PMO.

A pergunta que o Gate responde não é "conseguimos automatizar?". É "o caminho manual falhou?".
Automatizar antes disso constrói máquina para um problema que talvez não exista — e o
princípio de não construir agora o que provavelmente muda depois vale aqui inteiro.

---

## 4. Dependências obrigatórias

Nenhuma etapa desta trilha começa antes que **todas** estejam prontas. A razão é simples: um
conector que despeja preço num modelo de dado que ainda não distingue 900 ml de 1 L produz
comparação errada mais rápido do que a operação manual produziria.

| Dependência                         | Onde vive                                                    |
| ----------------------------------- | ------------------------------------------------------------ |
| produto exato implantado            | `../product/CANONICAL-PRODUCT-SPEC.md` · E1                  |
| aliases **por fonte**               | `../data/MVP-DATA-CONTRACT.md` + extensão desta trilha       |
| quantidades e unidades estruturadas | `../data/MVP-DATA-CONTRACT.md` §2 · E1                       |
| promoções e tipos de preço          | `../data/PROMOTION-TYPES.md` · E2                            |
| estados e expiração                 | `../data/OFFER-STATES.md` · E2                               |
| procedência                         | [`PRICE-PROVENANCE-POLICY.md`](PRICE-PROVENANCE-POLICY.md)   |
| RLS revisada                        | `docs/security/`                                             |
| leitura pública controlada          | `../data/OFFER-STATES.md` §3                                 |
| backup e restore                    | `docs/operations/RESILIENCE-RUNBOOK.md`                      |
| logs e incidentes                   | `docs/operations/INCIDENT-RESPONSE-PLAN.md`                  |
| processo de revisão humana          | [`AUTOMATION-QUALITY-GATES.md`](AUTOMATION-QUALITY-GATES.md) |
| revisão jurídica da fonte           | PM-DATA-1                                                    |
| aprovação do Founder e do PMO       | cada Gate                                                    |

**"Aliases por fonte" é a única dependência que o MVP não cobre sozinho.** Cada rede nomeia o
mesmo produto à sua maneira, e o alias que resolve uma fonte não resolve outra. O contrato de
alias do MVP (`CANONICAL-PRODUCT-SPEC.md` §5) precisa ganhar a dimensão de origem antes que
qualquer conector exista.

---

## 5. Matching

Ordem de precedência para decidir que um item de uma fonte é um SKU do catálogo. A ordem é
decrescente em confiança, e **os dois últimos nunca decidem sozinhos**.

1. **GTIN em campo estruturado confiável** — não GTIN extraído de texto livre;
2. **SKU da fonte previamente confirmado** — o vínculo já foi conferido por uma pessoa antes;
3. **alias humano confirmado** — curado, por fonte;
4. **marca + nome + variante + quantidade + unidade** — todos os cinco, estruturados;
5. **similaridade textual** — **somente como sugestão** para revisão humana;
6. **similaridade visual** — **somente como evidência auxiliar** de uma sugestão já existente.

### Regras invioláveis

Nenhum grau de similaridade, nenhum limiar e nenhum modelo autoriza cruzar estas linhas:

|                                                     |                              |
| --------------------------------------------------- | ---------------------------- |
| Tradicional ≠ Extraforte                            | Original ≠ Zero              |
| Integral ≠ Semidesnatado                            | 500 g ≠ 1 kg                 |
| 900 ml ≠ 1 L                                        | unidade ≠ pack               |
| varejo ≠ atacado                                    | preço geral ≠ preço de clube |
| preço online ≠ automaticamente preço de loja física |                              |

As três últimas são as que a automação erra com mais facilidade, porque são invisíveis no
nome do produto: um preço de atacado, de clube ou de canal online parece um preço comum até
alguém chegar à loja.

**Nenhum schema é criado por este documento.**

---

## 6. Qualidade

Detalhamento em [`AUTOMATION-QUALITY-GATES.md`](AUTOMATION-QUALITY-GATES.md).

Resumo: três classes de evidência (A elegível a automação, B revisão humana obrigatória,
C rejeição ou investigação), meta futura de **precisão composta superior a 96%** nas ofertas
publicadas, e uma oferta só conta como correta quando **catorze** dimensões estão
simultaneamente corretas.

**Precisão antes de volume.** Uma comparação com dez produtos certos vale mais do que uma com
cem produtos e três erros — porque três erros destroem a confiança nos noventa e sete
restantes.

---

## 7. Fontes

Estados e condições em [`SOURCE-CONNECTOR-STATUS.md`](SOURCE-CONNECTOR-STATUS.md).
**Nenhum estado ali constitui autorização de implementação.**

Os estados por fonte são **[H] — hipótese**. Os estudos anteriores relatados pelo Founder/PMO,
que cobrem cinco das seis redes, não foram localizados nem verificados (§4 daquele documento),
então nenhum estado ali se apoia em achado reproduzido.

---

## 8. Procedência

Regras em [`PRICE-PROVENANCE-POLICY.md`](PRICE-PROVENANCE-POLICY.md).

A regra que resume todas: **automação futura não pode usar "Informado pelo mercado" quando a
informação foi coletada por conector.** Dizer que o mercado informou algo que ninguém no
mercado informou é a única forma de mentira que este produto não pode cometer — é a
procedência que ele vende.

---

## 9. Infraestrutura preventiva

**Não criar.** Nenhuma tabela, nenhuma fila, nenhum agendador, nenhum campo "reservado para o
conector", nenhum feature flag adormecido.

O motivo é histórico e está registrado no projeto: preparação antecipada vira dívida quando a
decisão muda. Quando PM-DATA-0 for aprovado, a infraestrutura nasce com o desenho que o dado
real pedir — não com o que hoje parece provável.
