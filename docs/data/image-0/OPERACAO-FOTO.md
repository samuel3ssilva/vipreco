# Operação de foto — checklist, processamento e as 10 a 20 primeiras

Para quem vai à loja com o celular. Nada aqui exige equipamento, estúdio ou software pago.

---

## 1. Antes de sair: a autorização

**Não fotografe sem o mercado saber.** Duas coisas precisam estar combinadas:

1. o dono ou o gerente **sabe e concordou** que a equipe do ViPreço vai fotografar produtos na
   gôndola;
2. a linha de cessão está no aceite do piloto (proposta de texto em
   [`FONTES-E-DIREITOS.md`](./FONTES-E-DIREITOS.md) §6 — **ainda não aprovada juridicamente**).

Sem as duas, não fotografe. Não é preciosismo: é a diferença entre um asset que o produto pode usar
e um problema que aparece depois.

## 2. O checklist da foto

Uma foto por SKU. **Um SKU é a combinação exata de marca, variante e gramatura** — 500 g e 1 kg são
dois SKUs e duas fotos, mesmo que a embalagem pareça idêntica.

| #   | Item                                                 | Como conferir na hora                                                                                             |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | **O rótulo está legível na foto**                    | Dê zoom na própria foto. Se você não consegue ler a gramatura, o revisor também não.                              |
| 2   | **A gramatura aparece**                              | É o dado que separa dois SKUs. Se a embalagem esconde, tire uma segunda foto do lado com o peso.                  |
| 3   | **Produto de frente, inteiro**                       | Sem corte nas bordas, sem inclinação forte. O card mostra um quadrado.                                            |
| 4   | **Fundo o mais limpo possível**                      | Tire o produto da gôndola e apoie num plano claro, se o mercado permitir. Gôndola cheia atrás vira ruído a 64 px. |
| 5   | **Luz do ambiente, sem flash**                       | Flash em embalagem plástica cria um estouro branco que nenhum processamento conserta.                             |
| 6   | **Sem mão, sem preço na foto**                       | Mão distrai. Etiqueta de preço na foto vira preço que ninguém atualiza.                                           |
| 7   | **Sem outro produto identificável no enquadramento** | Marca de terceiro ao fundo é uso de marca de terceiro.                                                            |
| 8   | **Anote o SKU junto com a foto**                     | Marca, variante, gramatura e o mercado. De preferência na mesma mensagem em que a foto for enviada.               |

Falhou em qualquer item → tire de novo. É mais barato agora do que na revisão.

## 3. O processamento

Local, com ferramenta que já existe no macOS (`sips`) ou com qualquer editor. **Três passos:**

```bash
# 1. quadrado, pelo menor lado, centralizado
sips -c $(sips -g pixelHeight foto.jpg | tail -1 | awk '{print $2}') \
        $(sips -g pixelHeight foto.jpg | tail -1 | awk '{print $2}') foto.jpg --out quadrado.jpg

# 2. lado maior em 512 px
sips -Z 512 quadrado.jpg --out redimensionada.jpg

# 3. WebP com qualidade 82 (cwebp, do pacote webp)
cwebp -q 82 redimensionada.jpg -o cafe-marca-tradicional-500g.webp
```

Depois: `bun scripts/image/validar-imagens.ts`. Ele reprova formato, tamanho, proporção, peso e nome
fora da convenção. **Ele não sabe se a foto é do produto certo** — isso é a revisão humana da etapa
seguinte, e nenhum verde do validador a dispensa.

## 4. A revisão, antes de publicar

Cinco perguntas, todas da `IMAGE-POLICY.md` §4, com a resposta conferida **contra o registro do
produto**, nunca contra a memória:

1. Marca, variante, embalagem e **gramatura** conferem com o registro?
2. A embalagem na foto é a que está na loja hoje?
3. O fundo funciona no card claro **e** no escuro?
4. A procedência está registrada?
5. Há direito de uso?

Reprovou em qualquer uma → `rejected` + placeholder. **Placeholder é resposta correta; aproximação
não é.**

## 5. O plano das 10 a 20 primeiras fotos exatas

**Objetivo:** cobrir 100% dos Achados destacados e da categoria promovida do piloto, que é a meta da
`IMAGE-POLICY.md` §7.

### Como escolher os itens

A escolha **não é** "os 20 mais vendidos". É:

1. os produtos que o mercado do piloto escolheu divulgar (são eles que aparecem);
2. dentro deles, os que têm **mais de um mercado com preço** — porque é aí que a comparação
   acontece, e é o card que a pessoa abre;
3. desempate por categoria, para cobrir mercearia, laticínios e limpeza, e não vinte cafés.

### O roteiro, em uma visita

| Etapa                                   | Tempo estimado | Quem                         |
| --------------------------------------- | -------------- | ---------------------------- |
| Confirmar a lista de SKUs com o mercado | 10 min         | quem conduz o piloto         |
| Fotografar 20 SKUs, 2 fotos cada        | 40 a 60 min    | uma pessoa, com celular      |
| Processar e validar                     | 30 min         | CTO, no computador           |
| Revisar contra o registro               | 30 min         | duas pessoas, de preferência |
| Abrir o PR com os arquivos              | 15 min         | CTO                          |

**Uma visita produz o pacote inteiro.** É por isso que a origem A vence a origem D na matriz: vinte
itens não são um problema de escala, são uma tarde.

### O que fazer com o que sobrar

Todo SKU sem foto aprovada **fica com placeholder**, e isso é o estado normal. A meta de 100% vale
para os destacados; para o resto, a política já diz que placeholder é a resposta.

## 6. O que NÃO fazer, nunca

- Não use a foto de um SKU em outro, mesmo que a embalagem pareça igual.
- Não use imagem achada em busca de imagens.
- Não use a foto do encarte do mercado como foto de produto — encarte é fonte de **preço**, e traz
  marca, preço e layout de terceiro dentro dele.
- Não fotografe o logotipo do mercado para usar como identificação. A identificação é textual, e
  nenhum direito de uso de logotipo foi obtido para nenhum mercado.
- Não deixe a foto "quase certa" passar porque falta pouco para a meta de cobertura. A meta é
  operacional; o §1 da política não é.
