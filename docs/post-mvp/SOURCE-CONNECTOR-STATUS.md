# Estado das fontes candidatas

**Status: registro de avaliação. NÃO É ESCOPO DO MVP.**

> **Nenhum estado neste documento constitui autorização de implementação.** "GO" aqui
> significa "é a candidata mais promissora para uma investigação futura, se e quando o Gate
> autorizar" — não "pode começar".
>
> Nenhuma fonte foi acessada por conector. Nenhum preço foi coletado. Nenhum termo de uso foi
> aceito. A revisão jurídica é **PM-DATA-1** e ainda não aconteceu.

> **Estudos anteriores relatados pelo Founder/PMO não foram localizados nesta missão.** Ver
> §4 — este documento **não** afirma que investigação anterior nunca existiu.

**Marcadores de procedência usados neste documento:**

| Marcador | Significa                                                        |
| -------- | ---------------------------------------------------------------- |
| **[F]**  | contexto fornecido pelo Founder — não evidência reproduzida      |
| **[D]**  | decisão do PMO                                                   |
| **[H]**  | hipótese — plausível, não medida nem verificada por este projeto |
| **[C]**  | confirmado — verificado nesta missão, com evidência reproduzível |

---

## 1. Ordem provisória

| #   | Fonte         | Estado                                                                                                   |
| --- | ------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Atacadão      | **GO somente para spike futuro em shadow mode**                                                          |
| 2   | Savegnago     | **GO condicional** à comprovação de regionalização por canal e unidade                                   |
| 3   | Pague Menos   | **GO para investigação futura controlada**, com separação entre online, loja, promoção e Clube Leve Mais |
| 4   | São Vicente   | **Fallback**, condicionado à estabilidade da regionalização                                              |
| 5   | Carrefour     | **HOLD**                                                                                                 |
| 6   | Pão de Açúcar | **HOLD**                                                                                                 |

A ordem é provisória e não é ranking de qualidade: reflete apenas por onde faz mais sentido
começar a investigar, se houver investigação.

---

## 2. Por fonte

> **Todo o conteúdo técnico desta seção é [H] — hipótese.** As armadilhas descritas por fonte
> derivam de raciocínio sobre o modelo de negócio de cada rede e do contexto **[F]** do
> Founder; nenhuma delas foi observada, medida ou reproduzida por este projeto. Nada aqui
> pode ser citado como achado verificado. Ver §4.

### Atacadão — GO somente para spike futuro em shadow mode

Primeira candidata porque é a que menos depende de resolver regionalização antes de aprender
qualquer coisa. Um spike em **shadow mode** significa: coletar, guardar, auditar — e **não
publicar nada**.

**A armadilha específica desta fonte:** é atacado. `varejo ≠ atacado` é regra inviolável
(`AUTOMATED-PRICE-INGESTION-ROADMAP.md` §5), e um preço de atacado exibido ao lado de um preço
de mercado de bairro compara duas coisas que a pessoa não pode comprar nas mesmas condições —
quantidade mínima, embalagem, e às vezes cadastro.

Antes de qualquer publicação: provar que o conector distingue preço por unidade de preço por
caixa, e que a condição de compra fica escrita no card.

### Savegnago — GO condicional à regionalização

Condicional, e a condição é dura: **comprovar que preço varia por canal e por unidade, e que o
conector sabe qual está lendo.** Uma rede regional com muitas lojas costuma praticar preços
diferentes por loja e por canal; ler "o preço do Savegnago" sem saber de qual loja é ler um
número sem significado para quem vai comprar em Artemis.

Sem essa prova, não avança — nem para shadow mode.

### Pague Menos — GO para investigação futura controlada

Controlada porque esta fonte tem **quatro preços possíveis para o mesmo item**, e confundi-los
é o erro mais provável de toda a trilha:

| Preço               | O que é                                                |
| ------------------- | ------------------------------------------------------ |
| online              | preço do canal de venda pela internet                  |
| loja                | preço da gôndola física                                |
| promoção            | preço temporário, com validade e às vezes com condição |
| **Clube Leve Mais** | preço condicionado a programa de fidelidade            |

`preço geral ≠ preço de clube` e `preço online ≠ automaticamente loja física` são regras
invioláveis. Um preço de clube exibido como preço comum é uma promessa que a pessoa descobre
quebrada no caixa.

A investigação precisa provar que o conector separa os quatro **antes** de qualquer coleta que
possa virar publicação.

### São Vicente — Fallback

Não é a próxima da fila; é a alternativa caso a regionalização das anteriores se mostre
instável. Condicionada exatamente ao mesmo ponto: saber de qual loja é o preço.

### Carrefour e Pão de Açúcar — HOLD

**HOLD** significa: não investigar, não avaliar, não priorizar. Reavaliar é um card próprio
(PM-DATA-14) e depende de decisão do Founder/PMO — não de o restante da trilha ter dado certo.

---

## 3. O que precisa existir antes de mudar qualquer estado

1. **PM-DATA-0 aprovado** — o déficit de cobertura medido, não suposto;
2. **PM-DATA-1 concluído** — termos de uso lidos e parecer jurídico por fonte;
3. **as dependências obrigatórias** de `AUTOMATED-PRICE-INGESTION-ROADMAP.md` §4, todas;
4. **contrato de conector definido** — PM-DATA-04 no quadro;
5. **Gate humano explícito**, por fonte.

Uma fonte tecnicamente acessível e juridicamente autorizada ainda assim **não** entra sem os
outros quatro. Facilidade de acesso nunca foi o critério.

---

## 4. Registro de investigações anteriores

### [F] Existência relatada

O Founder/PMO informou que **dois estudos anteriores foram produzidos**:

| #   | Estudo                    | Fontes cobertas                     | Relatório esperado                   |
| --- | ------------------------- | ----------------------------------- | ------------------------------------ |
| 1   | plano técnico             | Pague Menos, São Vicente, Carrefour | `plano-coleta-automatica-ofertas.md` |
| 2   | investigação complementar | Savegnago, Atacadão                 | `investigacao-savegnago-atacadao.md` |

Esta é uma afirmação **[F]** do Founder/PMO, registrada como contexto. Não foi verificada, e
não precisa ser verificada para valer como registro do que foi relatado.

### NOT LOCATED

Nenhum dos dois relatórios foi encontrado nesta missão.

Caminhos inspecionados: árvore de trabalho completa do repositório, inclusive arquivos
ignorados pelo Git; o histórico de objetos de **todos** os refs (`git rev-list --all`);
`git stash`; e o diretório de sessão do projeto. Nenhum arquivo com esses nomes existe em
nenhum deles, e nenhum objeto do histórico contém esse conteúdo.

**Isto não afirma que as investigações nunca existiram.** É ausência de evidência localizável
nos caminhos inspecionados — não evidência de ausência. Os estudos podem existir fora do
repositório.

### NOT VERIFIED

Os achados técnicos específicos desses estudos **não foram reproduzidos nem validados** nesta
missão. Nenhuma fonte foi acessada. Nenhum achado do handoff pode ser promovido a **[C]** até
que o relatório seja localizado ou a evidência seja reproduzida.

Enquanto isso, os detalhes técnicos por fonte deste documento permanecem **[H]**, com exceção
das observações fornecidas pelo Founder — **[F]** — e das decisões do PMO — **[D]**.

### [C] Confirmado

Verificado nesta missão contra o código, o schema e a infraestrutura:

- **nenhum conector existe** — nenhum código de coleta, em nenhuma branch;
- **nenhuma coleta recorrente existe** — nenhum agendador, nenhuma fila, nenhum workflow;
- **nenhuma credencial de fonte existe** — nenhum secret, nenhuma variável de ambiente;
- **nenhum acordo com as redes existe**;
- **nenhum preço automatizado foi publicado** — toda linha de `prices` é manual ou fictícia;
- **nenhuma fonte foi acessada durante R0.5.**

### Pendência

> **Os relatórios anteriores devem ser localizados, versionados ou substituídos por evidência
> reproduzível antes de qualquer spike pós-MVP.**

Enquanto essa pendência estiver aberta, PM-DATA-1 começa do zero em termos de evidência: um
estudo que ninguém consegue abrir não pode sustentar um Gate. Rastreado como **PM-DATA-02**
em [`../pmo/TRELLO-MAPPING.md`](../pmo/TRELLO-MAPPING.md).

Não refazer as investigações, não acessar as fontes e não reconstruir os relatórios por
suposição — nada disso está autorizado.
