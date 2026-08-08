# Fontes de imagem, direitos e a matriz que decide

> **NOT VERIFIED — leia antes de usar.** Este documento mapeia origens candidatas e as perguntas
> que cada uma exige. **Nenhum termo de licença aqui foi confirmado juridicamente por mim**, e
> nenhuma imagem de terceiro foi baixada, testada ou cadastrada. Termos de uso mudam, e afirmar
> "esta fonte é livre" sem o contrato na mão é o tipo de erro que custa caro depois. Cada linha traz
> **o que precisa ser verificado, e por quem**.

---

## 1. As cinco origens possíveis

| #   | Origem                               | O que é                                                            | Cobertura esperada                                             | Direito de uso                                                                                                        |
| --- | ------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A   | **Fotografia própria em loja**       | A equipe do piloto fotografa a gôndola, com autorização do mercado | Alta para o catálogo do piloto (10 a 20 itens), zero fora dele | **Limpo.** A obra é nossa; a autorização do mercado cobre o local                                                     |
| B   | **Foto enviada pelo mercado**        | O lojista manda a foto do próprio produto                          | Média, depende do lojista                                      | Precisa de **cessão escrita** no aceite do piloto                                                                     |
| C   | **Imagem do fabricante**             | Banco de imagens ou press kit da marca                             | Média a alta para marcas grandes                               | Caso a caso. Press kit costuma ter licença de divulgação, e "divulgação" nem sempre cobre uso comercial em comparador |
| D   | **Catálogo por GTIN**                | API de terceiro que devolve dados e imagem por código de barras    | Alta na teoria; irregular no varejo brasileiro                 | **Incerto.** É o ponto que a `IMAGE-POLICY.md` §8 já classificou como fora do MVP                                     |
| E   | **Ilustração genérica de categoria** | Desenho próprio, sem marca                                         | Total, mas **não é o produto**                                 | Limpo — a obra é nossa                                                                                                |

## 2. Catálogo por GTIN — o que existe e o que falta perguntar

A opção mais conhecida no Brasil é a **Bluesoft Cosmos**, que expõe uma API de consulta por GTIN
com dados fiscais, marca, fabricante e — segundo a própria documentação — **imagem do produto** no
corpo da resposta. O acesso exige cadastro e um token de autenticação.

Endpoints relevantes para o nosso caso:

| Endpoint                                  | Serve para                                    |
| ----------------------------------------- | --------------------------------------------- |
| `GET /gtins/{codigo}`                     | resolver um código de barras num produto      |
| `GET /products?query={descricao ou gtin}` | busca paginada                                |
| `GET /products/by_date?date={ISO 8601}`   | o que mudou desde uma data — janela de 7 dias |

**As perguntas que precisam de resposta ANTES de qualquer linha de código** (todas para o
Founder/PMO, com apoio jurídico, não para o CTO):

1. A licença do plano contratado permite **exibir a imagem em produto comercial de terceiro**, ou só
   consultar dados fiscais?
2. Permite **armazenar** a imagem (que é o que o nosso CSP obriga), ou só referenciar o host deles?
3. Quem responde se a imagem estiver **errada para o SKU** — o catálogo ou nós? Do ponto de vista do
   morador, quem errou fomos nós.
4. A imagem devolvida é do **item exato** ou "da linha"? Se for da linha, a `IMAGE-POLICY.md` §1 já
   a rejeita — e aí a cobertura alta vira cobertura zero.
5. Custo por consulta e limite de taxa, contra um catálogo de 10 a 20 itens.

**Minha recomendação:** manter D fora do MVP, como a política já diz. A pergunta 4 sozinha provavelmente
o elimina — a força de um catálogo por GTIN é cobertura, e a nossa regra de gramatura exata é
justamente onde cobertura larga costuma falhar. Reabrir depois do piloto, se a curadoria manual se
mostrar o gargalo real.

## 3. Fabricantes — o mapa, e por que ele é menos útil do que parece

Para as categorias do piloto (café, arroz, feijão, leite), os fabricantes relevantes em Piracicaba e
região são um punhado de marcas nacionais mais marcas regionais. Duas realidades atrapalham:

1. **Press kit costuma cobrir "divulgação editorial"**, não uso comercial permanente num produto que
   compara preços entre lojas. É uma conversa jurídica por marca, e são muitas marcas.
2. **A imagem do fabricante é a da embalagem atual do catálogo dele**, que pode não ser a que está na
   gôndola do mercado de Artemis. A `IMAGE-POLICY.md` §4 item 2 já pede que a embalagem seja "a que
   está na loja hoje, e não uma versão antiga" — e o fabricante é justamente quem tem o incentivo de
   mostrar a nova.

**Recomendação:** não abrir frente com fabricante para o MVP. O custo de coordenação é alto, o
retorno é incerto e a origem A resolve o piloto inteiro.

## 4. A matriz de decisão

Critérios, em ordem de peso: **direito limpo** > **correspondência exata** > **custo de operação** >
**cobertura**. A ordem não é arbitrária — ela é a `IMAGE-POLICY.md` §1 traduzida em prioridade:
imagem errada destrói a confiança que o produto vende, então cobertura nunca ganha de exatidão.

| Origem                       | Direito                   | Exatidão                                              | Custo                            | Cobertura            | Veredito                                                       |
| ---------------------------- | ------------------------- | ----------------------------------------------------- | -------------------------------- | -------------------- | -------------------------------------------------------------- |
| **A · foto própria em loja** | limpo                     | **máxima** — foi tirada daquele item, naquela gôndola | alto por item, baixo em 20 itens | baixa fora do piloto | **ADOTAR para o MVP**                                          |
| **B · foto do mercado**      | precisa de cessão escrita | alta, se o lojista fotografar o item certo            | baixo                            | média                | **ADOTAR como complemento**, depois da cessão entrar no aceite |
| **C · fabricante**           | caso a caso               | média — risco de embalagem desatualizada              | alto de coordenação              | média                | **ADIAR** — reabrir em R7+                                     |
| **D · catálogo GTIN**        | incerto                   | **risco alto de "da linha"**                          | por consulta                     | alta na teoria       | **MANTER FORA** (política §8)                                  |
| **E · ilustração própria**   | limpo                     | **nenhuma** — não é o produto                         | já pago                          | total                | **SÓ EM DEMONSTRAÇÃO**, nunca com preço real                   |

## 5. A regra que nenhuma origem afrouxa

**Um preço real não pode receber ilustração de categoria.** Ele recebe foto com correspondência
exata aprovada, ou recebe o placeholder — que continua sendo o estado padrão, e não o de exceção.
Está escrito no adendo R3.3B da `IMAGE-POLICY.md`, e o teste
`demo-opportunities.ilustrativas.test.ts` mede.

## 6. O que precisa entrar no aceite do piloto

Uma linha, no documento que o mercado aceita:

> "O mercado autoriza o ViPreço a fotografar, em sua loja, os produtos incluídos no piloto, e a
> exibir essas fotos junto do preço informado, com identificação do mercado. As fotos são de autoria
> do ViPreço. O mercado pode pedir a retirada de qualquer foto pelo mesmo canal da conversa."

**Isso é decisão do Founder/PMO e passa por revisão jurídica.** Está aqui como proposta de texto,
não como texto aprovado. A `docs/mvp/MANUAL-OFFER-OPERATIONS.md` é o lugar de destino quando for.

---

**Fonte consultada nesta pesquisa:**
[Cosmos — Catálogo de Produtos, GTIN, NCM, Tributação e Marca](https://cosmos.bluesoft.com.br/api)
