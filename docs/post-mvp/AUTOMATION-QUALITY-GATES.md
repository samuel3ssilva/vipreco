# Gates de qualidade da automação

**Status: registro de critério. NÃO É ESCOPO DO MVP.** Nada aqui está implementado e nada
autoriza coleta ou publicação.

---

## 1. As três classes de evidência

Cada item que um conector produz recebe uma classe. A classe decide o que acontece com ele —
nunca o volume, nunca a pressa.

### Classe A — elegível futuramente para automação

**Todos** os campos críticos comprovados: identidade resolvida por GTIN estruturado ou por SKU
já confirmado, quantidade e unidade estruturadas, tipo de preço e canal explícitos, condição e
validade lidas de campo próprio.

"Elegível futuramente" é literal: mesmo Classe A **não publica** enquanto o Gate de publicação
(PM-DATA-4) não tiver sido aprovado.

### Classe B — revisão humana obrigatória

Identidade resolvida por alias ou por combinação de atributos; qualquer campo crítico inferido
em vez de lido; qualquer ambiguidade de canal, tipo de preço ou condição.

Vai para fila de revisão. Uma pessoa decide. **Não existe caminho automático de B para
publicado.**

### Classe C — rejeição ou investigação

Identidade resolvida só por similaridade textual ou visual; conflito entre campos; quantidade
não representável; preço fora de faixa plausível; qualquer sinal de que a página mudou de
formato.

Não publica, não entra em fila de revisão de rotina. Vira investigação do conector — porque
Classe C em volume não é problema de dado, é sintoma de conector quebrado.

---

## 2. A meta

> **Precisão composta superior a 96% nas ofertas publicadas.**

Composta é a palavra que faz o trabalho. Uma oferta só conta como correta quando **catorze**
dimensões estão simultaneamente corretas:

|               |              |                 |
| ------------- | ------------ | --------------- |
| 1. produto    | 6. embalagem | 11. região      |
| 2. marca      | 7. preço     | 12. canal       |
| 3. variante   | 8. tipo      | 13. validade    |
| 4. quantidade | 9. condição  | 14. procedência |
| 5. unidade    | 10. loja     |                 |

Errar uma só já reprova a oferta inteira. É deliberadamente severo: para quem lê o card, o
preço certo do produto errado e o preço de clube apresentado como preço comum são a mesma
falha — a comparação não serviu.

### Intervalo de confiança

Quando houver amostra suficiente, o Gate poderá exigir que **o limite inferior do intervalo de
confiança de 95% também seja superior a 96%** — não apenas a estimativa pontual.

A diferença é prática: 49 acertos em 50 dá 98% de estimativa pontual, mas o limite inferior do
IC de 95% fica bem abaixo de 96%. A exigência força amostra grande o bastante para a afirmação
significar alguma coisa, em vez de premiar quem auditou pouco.

### Prioridade

**Precisão sobre volume.** Quando as duas entrarem em conflito, corta-se volume. Um comparador
com poucos produtos certos continua sendo um comparador; com muitos produtos e alguns errados,
deixa de ser.

---

## 3. Revisão humana

A fila de revisão (PM-DATA-10) é parte da operação, não um andaime temporário. O que ela
precisa oferecer:

- o item da fonte e o SKU candidato lado a lado, com **todas** as catorze dimensões visíveis;
- a razão da classificação — por que B e não A;
- três desfechos: confirmar, corrigir, rejeitar;
- registro de quem decidiu e quando, sem dado pessoal além da identificação operacional;
- **nenhum desfecho automático por inatividade.** Item não revisado permanece não publicado.

---

## 4. O que reprova um conector

Independentemente da precisão medida:

- publicar qualquer coisa em shadow mode;
- atribuir procedência de mercado a dado coletado
  ([`PRICE-PROVENANCE-POLICY.md`](PRICE-PROVENANCE-POLICY.md));
- cruzar qualquer regra inviolável de matching;
- não distinguir canal, tipo de preço ou condição;
- não detectar mudança de formato da fonte — falhar em silêncio é pior do que falhar alto;
- produzir Classe C em volume crescente sem alerta.

---

## 5. Observabilidade mínima

Antes de qualquer publicação (PM-DATA-6):

- contagem por classe, por fonte, por execução;
- taxa de mudança de formato detectada;
- idade do dado publicado, por fonte;
- alerta quando a proporção de Classe C sobe;
- alerta quando uma execução não roda;
- trilha de auditoria de cada publicação e de cada correção.

Sem isso, um conector que quebrou silenciosamente continua servindo preço velho como se fosse
atual — e o produto perde exatamente a promessa que o define.
