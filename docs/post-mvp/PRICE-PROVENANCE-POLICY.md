# Política de procedência de preço

**Status: NORMATIVO** para o que já existe (as seis origens do MVP) e **registro de critério**
para o que ainda não existe (coleta por conector). Nada da parte de automação está
implementado.

A procedência não é metadado. É **o produto**: o ViPreço vende a afirmação de que todo preço
aparece acompanhado de mercado, data e origem. Uma origem errada não é um campo errado — é a
promessa quebrada.

---

## 1. As origens, separadas

| Origem                                 | O que significa                                           | Existe hoje          |
| -------------------------------------- | --------------------------------------------------------- | -------------------- |
| **informado pelo mercado**             | uma pessoa do estabelecimento enviou o preço              | sim (`store_list`)   |
| **pesquisa em loja**                   | alguém do ViPreço anotou o preço na gôndola               | sim (`weekly_audit`) |
| **comprovado por documento permitido** | o preço foi conferido em documento de compra              | sim (`receipt`)      |
| **coletado no site oficial**           | um conector leu o preço no site do mercado                | **não existe**       |
| **coletado em folheto oficial**        | um conector leu o preço em folheto publicado pelo mercado | **não existe**       |

As três primeiras estão implementadas em `src/lib/sources.ts`, com rótulo, descrição e nível de
evidência próprios. As duas últimas **não existem** e só passam a existir com a trilha pós-MVP
autorizada.

`shelf_photo` (foto da etiqueta) e `community` (informado pela comunidade) continuam como
estão; `social_media` (oferta anunciada) é anúncio publicado pelo próprio mercado e **não** se
confunde com coleta por conector.

---

## 2. A regra que não se negocia

> **Automação futura não pode usar "Informado pelo mercado" quando a informação foi coletada
> por conector.**

Ninguém do mercado informou nada. Dizer que informou transfere ao estabelecimento a
responsabilidade por um dado que ele não entregou, e transforma a procedência — a única coisa
que o produto realmente garante — em ficção.

O registro correto é explícito quanto ao meio e ao instante:

```
Coletado no site oficial do mercado em DD/MM/AAAA às HH:MM.
```

Com hora, porque preço de site muda no mesmo dia. A data sozinha, que basta para pesquisa em
loja, não basta aqui.

---

## 3. O que a procedência não pode insinuar

Nenhum texto, selo, ícone, cor ou disposição pode sugerir:

- **parceria** — o mercado não é parceiro por ter o preço lido;
- **aprovação** — ninguém aprovou a publicação;
- **integração** — não há acordo técnico;
- **endosso** — o mercado não avalizou nada.

Vale para a interface, para o texto compartilhado no WhatsApp, para a prévia de link e para
qualquer material voltado a terceiros. Um mercado coletado aparece com o mesmo peso visual de
qualquer outro, e a origem escrita diz exatamente o que aconteceu.

---

## 4. Procedência é uma das catorze dimensões

`AUTOMATION-QUALITY-GATES.md` §2 conta procedência entre as catorze dimensões que precisam
estar simultaneamente corretas para uma oferta contar como correta. Procedência errada reprova
a oferta inteira, mesmo com preço certo — porque o preço certo com origem errada é justamente
o caso que o produto existe para evitar.

---

## 5. Correção e retirada

Quando um mercado pedir correção ou retirada de um preço coletado, o pedido vale igual ao de
um preço informado: mesmo canal, mesmo prazo, mesmo registro. A origem do dado não muda o
direito de quem é citado.

A fronteira já escrita em `docs/mvp/FOR-MARKETS-PAGE.md` continua valendo — o mercado controla
o que ele mesmo enviou. Um preço coletado não é algo que ele enviou; ainda assim, o pedido de
correção é atendido, porque a alternativa é publicar um preço que o estabelecimento afirma
estar errado.

---

## 6. O que este documento não decide

- se algum conector será construído — Gate PM-DATA-0;
- se alguma fonte específica pode ser lida — Gate PM-DATA-1, revisão jurídica;
- o formato de armazenamento dos novos valores de origem — depende de R1/R2 e do contrato de
  conector.
