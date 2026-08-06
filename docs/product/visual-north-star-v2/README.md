# North Star V2 — assets

**Estado em 06/08/2026: a pasta está vazia de binários, e esse é o estado correto.**

O mandato do Founder/PMO de 06/08/2026 informa que os materiais do North Star V2 foram
anexados. **Eles não chegaram à sessão que escreveu este arquivo.** Onde procurei e o que
encontrei está registrado em [`../NORTH-STAR-V2-ASSESSMENT.md`](../NORTH-STAR-V2-ASSESSMENT.md) §2.

**Nenhum arquivo foi criado no lugar deles.** Um PNG inventado com o nome de North Star V2 seria
pior que a ausência: viraria referência de design de alguém, e a referência seria falsa. A regra
do mandato é explícita — _"Não criar arquivo falso quando algum binário não estiver disponível."_

O que **não** depende dos binários já está registrado e vale desde agora: as decisões
consolidadas do North Star V2, em [`../NORTH-STAR-V2-ASSESSMENT.md`](../NORTH-STAR-V2-ASSESSMENT.md) §3 e §4.

---

## Quando os arquivos chegarem

Um por linha na tabela abaixo, com **tudo medido no arquivo recebido**, nunca declarado de
memória:

| Item         | Como obter                                                        |
| ------------ | ----------------------------------------------------------------- |
| Arquivo      | caminho relativo a esta pasta                                     |
| SHA-256      | `shasum -a 256 <arquivo>`                                         |
| Dimensões    | `file <arquivo>` ou `sips -g pixelWidth -g pixelHeight <arquivo>` |
| Tamanho      | `wc -c < <arquivo>`, em bytes                                     |
| Origem       | quem produziu, e em qual ferramenta                               |
| Data         | data em que o Founder aprovou                                     |
| Recompressão | **nenhuma** — versionar o original, byte a byte                   |

O North Star **original** está versionado assim, e serve de modelo:
[`../visual-north-star/`](../visual-north-star/), com a ficha completa em
[`../VISUAL-IMPLEMENTATION-CONTRACT.md`](../VISUAL-IMPLEMENTATION-CONTRACT.md).

| Arquivo             | SHA-256 | Dimensões | Tamanho | Origem | Data |
| ------------------- | ------- | --------- | ------- | ------ | ---- |
| _(nenhum recebido)_ | —       | —         | —       | —      | —    |

---

## O que estes assets **não** serão, quando existirem

O mesmo que o North Star original não é, e pela mesma razão
([`../VISUAL-IMPLEMENTATION-CONTRACT.md`](../VISUAL-IMPLEMENTATION-CONTRACT.md) §1):

- **não são fonte de dado.** Nenhum preço, nome de mercado, bairro, data, validade, promoção ou
  logotipo que apareça neles pode ser tratado como real ou copiado para dentro do produto;
- **não são contrato funcional.** Em qualquer conflito com `docs/product/`, `docs/data/` ou
  `docs/security/`, ganha o contrato;
- **não autorizam tela nenhuma.** O caminho para implementar uma tela continua sendo o da §4 do
  contrato visual: spec, inventário, contratos, testes, capturas, Gate.
