# Estado das fontes candidatas

**Status: registro de avaliação. NÃO É ESCOPO DO MVP.**

> **Nenhum estado neste documento constitui autorização de implementação.** "GO" aqui
> significa "é a candidata mais promissora para uma investigação futura, se e quando o Gate
> autorizar" — não "pode começar".
>
> Nenhuma fonte foi acessada por conector. Nenhum preço foi coletado. Nenhum termo de uso foi
> aceito. A revisão jurídica é **PM-DATA-1** e ainda não aconteceu.

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

## 4. Registro de investigações existentes

Nenhuma investigação técnica foi feita por este projeto. Não há conector, não há amostra
coletada, não há credencial, não há acordo e não há contato com nenhuma das seis redes.

O que existe é o que está escrito aqui: uma ordem provisória e um conjunto de condições,
derivados do contexto **[F]** do Founder registrado em
`AUTOMATED-PRICE-INGESTION-ROADMAP.md` §1.
