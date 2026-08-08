# IMAGE-0 — estratégia de imagem de produto

**Status: descritivo e de planejamento.** Nada aqui está implementado, e nada aqui autoriza
implementar. A norma continua sendo [`docs/data/IMAGE-POLICY.md`](../IMAGE-POLICY.md); estes
documentos dizem **como chegar lá** e **o que ainda falta decidir**.

Escrito no mandato PRE-WEEKEND VISUAL DEMO FREEZE §30, depois dos dois Gates visuais.

| Documento                                        | O que responde                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [`INVENTARIO.md`](./INVENTARIO.md)               | O que existe hoje, medido. Quantas imagens, onde, sob qual portão, e o que o banco **não** tem.          |
| [`FONTES-E-DIREITOS.md`](./FONTES-E-DIREITOS.md) | De onde uma imagem pode vir, quem detém o direito de cada origem, e a matriz que decide.                 |
| [`ARQUITETURA-R6.md`](./ARQUITETURA-R6.md)       | O caminho da imagem, do arquivo bruto ao card, e o que precisa existir no schema, no Worker e no CSP.    |
| [`OPERACAO-FOTO.md`](./OPERACAO-FOTO.md)         | O checklist de quem vai à loja fotografar, o processamento e o plano das 10 a 20 primeiras fotos exatas. |
| [`WEEKEND-DEMO-PACK.md`](./WEEKEND-DEMO-PACK.md) | O que dá para usar **neste fim de semana**, sem pipeline nenhum.                                         |

Validador executável: [`scripts/image/validar-imagens.ts`](../../../scripts/image/validar-imagens.ts),
com testes em [`scripts/image/validar-imagens.test.ts`](../../../scripts/image/validar-imagens.test.ts).

---

## A conclusão, em cinco linhas

1. **Hoje o produto tem zero fotografia de produto.** Tem três ilustrações genéricas de categoria,
   e elas vivem numa branch que ainda não foi mergeada.
2. **O banco não tem nenhum campo de imagem.** A `IMAGE-POLICY.md` descreve sete colunas que **não
   existem** em nenhuma migration. Esse é o primeiro trabalho de R6, e é uma migration — gate humano.
3. **O CSP proíbe qualquer host externo** (`img-src 'self' data:`). Toda imagem tem de ser servida
   pelo próprio domínio. Isso é um acerto, não um obstáculo: transforma "de onde veio a imagem" numa
   pergunta que o pipeline responde uma vez, e não em cada requisição do navegador.
4. **A única origem com direito de uso limpo e cobertura previsível é a fotografia própria em loja**,
   feita com autorização do mercado. Catálogo por GTIN é um atalho de cobertura com licença incerta,
   e por isso continua fora do MVP.
5. **Para este fim de semana, nada disso é necessário.** O pacote de demonstração usa asset próprio,
   genérico e fictício, e está pronto.

## O veredito

```
IMAGE STRATEGY READY FOR R6
WEEKEND DEMO IMAGE WORKFLOW READY
```

## O que este pacote NÃO faz

Não altera o CSP, não escreve migration, não cadastra imagem, não contrata provedor, não baixa
imagem de terceiro, não fotografa nada e não decide prioridade de roadmap. Cada uma dessas coisas
tem um dono, e o dono não é o CTO sozinho.
