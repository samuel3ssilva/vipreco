# Material offline

Um arquivo: [`kit-piloto.html`](./kit-piloto.html). Abre em qualquer navegador, **funciona
sem internet**, imprime em papel A4 sem ajuste.

**Autossuficiente de verdade.** Sem CDN, sem fonte externa, sem imagem externa, sem script.
CSS embutido, desenhos em SVG inline e o **QR Code embutido como `data:` URI**. Copiar o
arquivo para o celular basta — não é preciso copiar pasta nenhuma junto. Essa promessa é o
motivo de o QR não ser um `<img src="arquivo.png">`: bastaria alguém mandar o HTML sozinho por
WhatsApp para o quadrado virar um ícone quebrado no meio da conversa.

## O QR Code (06/08/2026)

Aponta para **staging**, e a legenda diz isso: "Demonstração — ambiente de teste do ViPreço".
Autorizado pelo Founder apenas para **entrevistas privadas**. O endereço público definitivo é
de R8; este QR será trocado lá.

| Arquivo                       | Para quê                                             |
| ----------------------------- | ---------------------------------------------------- |
| `qr-demo-staging.png`         | 540 × 540 px, para colar em slide ou imprimir avulso |
| `qr-demo-staging.svg`         | vetorial, para impressão em qualquer tamanho         |
| embutido no `kit-piloto.html` | o caderno de campo, que continua sendo um arquivo só |

Destino: `https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/para-mercados`

Gerado por `scripts/qr/gerar-demo-staging.ts` — código próprio, sem dependência nova, com a URL
como constante do arquivo e uma guarda que recusa qualquer destino fora de `.workers.dev`.
**Foi lido por um decodificador independente antes de entrar aqui**, e isso não é formalidade:
a primeira versão do codificador produziu três símbolos de aparência perfeita e completamente
ilegíveis. Aparência não é evidência num QR.

**Se não houver internet na conversa, não insista com o QR.** As telas do caderno mostram a
mesma coisa, e é para isso que ele existe.

---

## Por que HTML, e não PDF

O projeto não tem cadeia de geração de PDF, e criar uma para um material de campo
acrescentaria uma dependência de build para resolver um problema que o navegador já resolve.
Quem precisar de PDF imprime o HTML para arquivo — a folha de estilo tem regras de impressão
para isso, e o resultado sai em A4 com quebras nos lugares certos.

---

## O que ele tem

1. o que o ViPreço é, em uma frase;
2. como o consumidor encontra o mercado — os quatro momentos, com desenho;
3. como o piloto funcionaria, em cinco passos;
4. o que se pede ao mercado;
5. benefícios **potenciais**, escritos como potenciais;
6. neutralidade;
7. o que o ViPreço **não** é;
8. roteiro resumido, para consulta rápida na conversa.

---

## O que ele **não** tem, e por quê

**Nenhuma captura de tela real.** Os desenhos são esquemas em SVG, feitos para esta página, e
cada um está rotulado como protótipo. Um screenshot do laboratório mostraria "Mercado Exemplo"
e "R$ 12,90" com aparência de produto pronto — e material de campo com cara de produto pronto
é promessa, não ilustração.

**Nenhuma imagem do North Star.** O North Star original contém logotipos de redes reais, e
nenhum direito de uso foi obtido para nenhuma delas. Mostrar essa imagem a um lojista sugere
exatamente o que não é verdade: que aquelas redes participam. O **North Star V2** não tem
binários recebidos — o registro está em
[`../../../product/NORTH-STAR-V2-ASSESSMENT.md`](../../../product/NORTH-STAR-V2-ASSESSMENT.md) §2.

**Nenhum QR Code.** Depende de uma URL estável e aprovada, que não existe antes de R8. A
página **reserva o lugar** e diz o que falta, em vez de apontar para um endereço provisório
que morre na semana seguinte — um QR quebrado na mão de um lojista custa mais confiança do
que a ausência dele.

**Nenhum número.** Sem usuários, sem tráfego, sem aumento de venda, sem "mercados já
participando". Nada disso existe.

---

## A frase que governa o tom

> **"Esta é a experiência que estamos construindo para o piloto."**

Ela aparece literalmente na página, no topo e ao lado dos desenhos. Não é ressalva de rodapé:
é o enquadramento inteiro do material. Todo verbo da página está no futuro ou no condicional
quando fala do que ainda não existe.

---

## Antes de usar em campo

O gate de contato externo **continua fechado**. Este material existe escrito e validado; usá-lo
com uma pessoa real depende de autorização específica do Founder
([`../README.md`](../README.md)).
