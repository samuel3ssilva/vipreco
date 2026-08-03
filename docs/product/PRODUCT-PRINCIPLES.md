# Princípios de produto — critérios de desempate

**Status: NORMATIVO.** Estes dez princípios foram fixados pelo Founder/PMO no mandato da Fase R0.5
como critério de desempate para decisões de produto e de dados. Quando duas alternativas parecerem
igualmente defensáveis, vence a que respeita o princípio de número menor.

Eles não substituem os **princípios invioláveis** do `CLAUDE.md`, que continuam sendo o piso técnico
do repositório. Estes aqui resolvem escolhas; aqueles proíbem.

---

## Os dez princípios

**1. Produto exato antes de conveniência.**
Se juntar dois registros deixa a interface mais simples mas a comparação menos exata, não junte.
250 g nunca é 500 g. Marca própria de uma rede nunca é marca própria de outra.

**2. Confiança antes de promoção.**
Entre exibir um número atraente e exibir um número defensável, exibe-se o defensável. Nenhum preço
efetivo aparece sem a condição que o produz escrita ao lado.

**3. Dado estruturado antes de interpretação de texto.**
"500 g" numa string não é quantidade. Enquanto o dado não estiver estruturado e aprovado, o produto
não calcula em cima dele — nem em tempo de exibição, nem em tempo de comparação.

**4. Leitura pública mínima.**
O público lê o menor conjunto de campos que resolve a tarefa. Ampliar o que o anônimo enxerga é
decisão de segurança, não de produto.

**5. Nenhuma escrita pública em tabelas de negócio.**
`markets`, `products` e `prices` não recebem escrita de anônimo, por nenhum caminho. Vale também
para qualquer tabela futura de oferta, imagem ou promoção.

**6. Nenhuma imagem aproximada.**
Imagem de outra gramatura ou de outra variante é pior do que nenhuma imagem. Placeholder é resposta
correta; aproximação não é.

**7. Nenhuma coleta de dado pessoal desnecessário.**
O produto funciona sem login, sem cookie de rastreio e sem identificador persistente. Se um evento
de analytics precisa de dado pessoal para ser útil, o evento está errado.

**8. Nenhuma decisão paga altera ranking.**
Destaque, parceria e pagamento vivem em seção separada e rotulada. A lista orgânica é ordenada só
por preço, recência e desempate estável.

**9. Fixture e banco usam o mesmo contrato de domínio.**
A demonstração e o piloto não podem divergir na forma do dado. Um adapter troca a fonte; o contrato
é um só.

**10. Nenhuma migration é aplicada sem novo gate humano.**
Escrever a migration é trabalho do CTO. Aplicá-la em staging ou em produção é decisão do
Founder/PMO, sempre.

---

## Como usar

Um princípio resolve uma decisão quando a decisão pode ser derivada dele sem inventar informação
nova. Quando nenhum dos dez alcança a questão, a decisão fica **PENDENTE** e vai para
[`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) como pergunta aberta.

Uma decisão PENDENTE pode aparecer na documentação como pergunta. **Não pode virar código nem
migration.**
