# Runbook da demonstração — Artemis

Duas telas, dois roteiros, uma página. Leia antes; não leia durante.

|                   |                                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| **Morador**       | https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/                |
| **Lojista**       | https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/para-mercados   |
| **QR do lojista** | `docs/business/interviews/offline/qr-demo-staging.png` — abre a segunda URL |

**Isto é staging.** Toda página traz a faixa "AMBIENTE DE TESTE" no topo, e ela deve ficar. É ela
que separa "olha como vai funcionar" de "olha os preços de hoje".

---

## Roteiro do consumidor

1. **Abrir a Home.** A primeira linha diz ARTEMIS · PIRACICABA, SP. Deixe a pessoa ler sozinha.
2. **Explicar Artemis em uma frase.** "Estamos começando por um bairro só, com poucos mercados."
3. **Mostrar o Achado.** Produto, quantidade, preço, mercado e bairro, na mesma tela.
4. **Abrir o produto** por "Ver preços por mercado". É aqui que a comparação aparece: um preço
   por mercado, do menor para o maior.
5. **Mostrar a procedência.** Fonte, data e validade em cada linha. É o que separa o ViPreço de
   um grupo de WhatsApp.
6. **Mostrar a busca.** Toque num dos quatro atalhos, ou digite "café" — dois tamanhos aparecem,
   e eles **não** se misturam. Essa é a tese inteira em um exemplo.

## Roteiro do lojista

1. **Comece pela experiência do morador**, não pela página dele. O lojista precisa ver o que o
   cliente veria.
2. **Mostre uma oferta** na Home: o nome do mercado aparece, com a fonte e a data.
3. **Abrir `/para-mercados`** — pelo QR, se ele estiver com o celular na mão.
4. **Explicar o piloto:** poucos mercados, um bairro, sem custo e sem compromisso.
5. **Mostrar o exemplo de oferta**, que está rotulado "Exemplo fictício".
6. **Abrir uma ou duas perguntas do FAQ** — as treze estão recolhidas; abra as que ele levantar.
7. **CTA:** "Quero conversar sobre o piloto". Ele abre o WhatsApp com uma mensagem pronta.

---

## O que dizer quando perguntarem

**"Esses preços são reais?"** Não. São fictícios, e a página diz isso em dois lugares. O que é
real é o formato: no piloto, cada preço tem mercado, fonte, data e validade.

**"Vocês têm todos os mercados?"** Não, e não vamos ter no começo. O piloto é com poucos mercados
de Artemis. O produto nunca diz "o mais barato da cidade" porque não teria como sustentar.

**"Essas imagens são fotos dos produtos?"** Não. São ilustrações genéricas nossas, e o texto
alternativo diz isso. No piloto, ou tem foto do item exato com a gramatura certa, conferida por
uma pessoa, ou não tem foto.

**"O mercado paga para aparecer em primeiro?"** Não existe essa possibilidade. A ordem é por
preço, e nada a reordena.

---

## DO NOT DEMO

Uma entrada, e o motivo está escrito. Nenhuma rota do produto está fora dos limites.

- **Não demonstre busca por código de barras.** A busca aceita GTIN e continua funcionando, mas
  **nenhum produto de demonstração tem código**: código de barras real pertence a produto real, e
  o contrato de fixture não admite nem inventar um nem emprestar o de outra marca. Digitar um
  código devolve "nenhum produto encontrado", que é a resposta correta e parece defeito.

## O que é seguro deixar a pessoa explorar sozinha

Tudo o mais. Foi percorrido no staging real antes desta demonstração:

- todos os atalhos da busca devolvem resultado;
- todo link leva a uma página que existe;
- busca sem resultado mostra um convite, não um erro;
- produto inexistente mostra "Produto não encontrado" com o caminho de volta;
- as rotas internas de laboratório respondem 404 em staging;
- nenhuma ação promete o que o produto não faz.

**Uma aspereza conhecida, e ela é pequena:** "Ver endereço" abre o Google Maps num ponto do mapa,
porque o endereço do mercado fictício é fictício. Se alguém tocar, é só dizer que o endereço é de
demonstração.

## Se algo der errado

**A página não carrega.** Confira o sinal antes de culpar o produto: staging responde em
milissegundos, e o `curl` de smoke está registrado no checkpoint da missão.

**Alguém pergunta por uma funcionalidade que não existe** (login, alerta de preço, lista de
compras). A resposta honesta é a melhor: "ainda não existe, e é exatamente isso que estou vindo
perguntar". Não prometa data.

**Não altere nada durante a demonstração.** Se aparecer um defeito, anote e siga. O produto está
congelado de propósito.
