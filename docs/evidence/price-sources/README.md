# Evidências sobre fontes de preço — índice e protocolo

**Status: NORMATIVO como protocolo. NÃO É ESCOPO DO MVP.**

> **Esta pasta está vazia de evidências, e isso é o estado correto.** Nenhuma fonte foi
> acessada, nenhuma coleta foi feita e nenhum estudo foi reproduzido. Este arquivo define
> **como** uma evidência entra aqui — não afirma que alguma já entrou.
>
> Nada nesta pasta autoriza acessar fonte, coletar preço ou construir conector. Autorização é
> Gate humano ([`../../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md) §2).

---

## 1. Objetivo

Separar **o que sabemos** de **o que supomos** sobre as fontes candidatas.

A trilha pós-MVP tem seis redes candidatas, um conjunto de hipóteses sobre cada uma, e nenhuma
evidência reproduzível. Quando o Gate PM-DATA-0 for avaliado, a diferença entre "o Founder acha"
e "está comprovado" precisa estar escrita — porque um Gate decidido sobre hipótese apresentada
como fato é um Gate decidido sobre nada.

Esta pasta é o lugar onde uma afirmação sobre fonte passa a ter procedência. O produto inteiro
se sustenta na ideia de que todo preço vem com origem e data; a documentação que decide de onde
os preços virão obedece ao mesmo padrão.

---

## 2. Hierarquia de confiança

Da mais forte para a mais fraca. Uma afirmação nunca sobe de nível por repetição, por
antiguidade ou por quem a fez.

| #   | Nível                                  | Vale como                                  |
| --- | -------------------------------------- | ------------------------------------------ |
| 1   | **evidência direta reproduzível**      | prova, enquanto não expirar (§7)           |
| 2   | **evidência direta não reproduzível**  | indício forte; exige nova verificação      |
| 3   | **relatório de terceiro versionado**   | indício; depende de quem produziu e quando |
| 4   | **relato do Founder/PMO**              | contexto — nunca prova técnica             |
| 5   | **inferência sobre modelo de negócio** | hipótese                                   |
| 6   | **suposição**                          | nada. Não entra em documento normativo     |

Reproduzível significa: outra pessoa, seguindo o que está escrito, chega ao mesmo resultado. Um
screenshot sem URL, sem data e sem método é nível 2 no melhor caso — mostra que algo foi visto,
não permite ver de novo.

---

## 3. Nomenclatura

```
AAAA-MM-DD__<fonte>__<assunto>__<tipo>.<ext>
```

- **data primeiro**, em ISO, para ordenar sozinho e para deixar a idade visível no nome;
- **fonte** em minúsculas, sem acento e sem espaço;
- **assunto** curto e específico — `precos-por-loja`, não `analise`;
- **tipo** — `relatorio`, `captura`, `amostra`, `parecer`, `nota`.

Exemplos da forma esperada, **nenhum deles existente**:

```
2026-09-14__exemplo-rede__precos-por-loja__relatorio.md
2026-09-14__exemplo-rede__precos-por-loja__captura.png
```

Cada arquivo que não seja Markdown **precisa** de um `.md` irmão de mesmo nome-base com os
metadados de §4. Binário sem descrição não é evidência: é um arquivo que ninguém sabe o que é.

---

## 4. Metadados obrigatórios

Todo registro de evidência abre com este bloco. Campo que não se aplica fica escrito como
`n/a` — nunca em branco, porque branco não distingue "não se aplica" de "esqueceram".

| Campo                     | Regra                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| **fonte**                 | qual fonte                                                             |
| **mercado ou rede**       | a rede observada                                                       |
| **loja, região e cidade** | a que unidade o dado pertence. `n/a` só se comprovadamente irrelevante |
| **URL**                   | endereço exato observado                                               |
| **data e hora**           | com fuso. Hora importa: preço de site muda no mesmo dia                |
| **método**                | como foi obtido, em passos que outra pessoa consegue repetir           |
| **ambiente**              | onde rodou                                                             |
| **versão do conector**    | quando existir conector; hoje, `n/a`                                   |
| **responsável**           | identificação **operacional** de quem verificou — nunca dado pessoal   |
| **arquivos relacionados** | capturas, amostras, pareceres                                          |
| **resultado**             | o que foi observado, sem interpretação                                 |
| **limitações**            | o que o registro **não** prova                                         |
| **classificação**         | um marcador de §6                                                      |
| **revalidar até**         | data a partir da qual o registro é presumido obsoleto (§7)             |

O campo **limitações** não é formalidade. Um registro que prova o preço de uma loja num
instante não prova o preço da rede, não prova o preço de amanhã e não prova o preço do outro
canal. Escrever o limite é o que impede a evidência de ser citada além do que ela sustenta.

---

## 5. Critérios de reprodução

Um registro só é **[C]** se satisfizer os cinco:

1. o **método** está escrito em passos executáveis, não em resumo;
2. a **URL** ou o ponto de acesso exato está registrado;
3. o **resultado** está separado da **interpretação**;
4. as **limitações** estão declaradas;
5. outra pessoa conseguiria repetir sem falar com quem escreveu.

Faltando qualquer um, a classificação máxima é **[H]**.

---

## 6. Classificação das afirmações

**Esta tabela é a definição normativa dos marcadores.** Os demais documentos do projeto
referenciam esta seção em vez de redefini-los.

| Marcador | Significa                                      |
| -------- | ---------------------------------------------- |
| **[C]**  | confirmado por evidência direta e reproduzível |
| **[H]**  | hipótese ainda não comprovada                  |
| **[F]**  | observação ou contexto fornecido pelo Founder  |
| **[D]**  | decisão formal do Founder/PMO                  |
| **[J]**  | revisão jurídica pendente                      |

Regras de uso:

- **[F] nunca vira [C] por repetição.** Vira [C] quando alguém reproduz e registra aqui;
- **[D] não depende de evidência** — decisão é decisão. Mas uma decisão tomada sobre [H]
  registra que foi tomada sobre [H];
- **[J] bloqueia acesso à fonte**, independentemente de qualquer [C]. Descobrir que uma fonte é
  tecnicamente acessível não autoriza acessá-la;
- na dúvida entre dois marcadores, vale o **mais fraco**.

---

## 7. Atualização e expiração

Preço, catálogo e estrutura de site mudam. Evidência sobre fonte tem prazo.

- todo registro traz **revalidar até**;
- passada a data, o registro é **presumido obsoleto** — continua no repositório, marcado, e
  deixa de sustentar [C];
- **relatório temporário não é prova de estado atual.** Um estudo de três meses atrás descreve o
  que a fonte era, não o que ela é;
- registro obsoleto **não se apaga.** Marca-se e mantém-se: saber que algo já foi verdade tem
  valor de auditoria;
- revalidar é produzir registro **novo**, com data nova. Nunca editar a data do antigo.

Sem data de revalidação, o padrão é **90 dias** a partir da observação. É piso, não regra: fonte
volátil nasce com prazo menor, por tipo de evidência, e o padrão só vale onde ninguém definiu nada.

**Este prazo é da evidência, nunca do preço.** Ele diz quando uma afirmação sobre a fonte precisa
ser verificada de novo. Não é validade de preço, duração de oferta, prazo de folheto nem
autorização para manter preço publicado, e não substitui `valid_until` nem os estados `active`,
`ended`, `sold_out` e `expired` de [`../../data/OFFER-STATES.md`](../../data/OFFER-STATES.md).
Preço e oferta obedecem aos próprios campos, estados e evidências: evidência dentro do prazo não
mantém vivo um preço vencido, e evidência vencida não derruba um preço válido.

---

## 8. Segurança

Nunca entram nesta pasta, em nenhuma forma, nem em screenshot, nem em log colado, nem em anexo:

- secret, senha, token, chave de API;
- cookie de sessão ou cabeçalho de autenticação;
- **CPF** ou qualquer documento;
- dado pessoal de qualquer pessoa;
- credencial de consumidor;
- conteúdo obtido por **bypass de proteção** — CAPTCHA contornado, autenticação furada,
  limitação de acesso driblada. Além de ser proibido, tornaria o registro imprestável: prova
  obtida assim não pode ser reproduzida por ninguém legitimamente.

Sobre capturas de tela: precisam de **origem, data e contexto** no `.md` irmão, e precisam ser
revisadas antes de entrar — a barra de endereço, uma aba aberta ao lado ou um nome de usuário no
canto vazam mais do que o assunto do registro.

A regra do `CLAUDE.md`, princípio 6, vale integralmente aqui: **sem segredos no Git.**

---

## 9. Jurídico

**Termos de uso e risco jurídico permanecem [J] até revisão adequada.** Vale para todas as
fontes, sem exceção e independentemente do que a evidência técnica mostrar.

- **PM-DATA-1** é o Gate que trata disto, e ele ainda não aconteceu;
- nenhum termo de uso foi lido, aceito ou avaliado em nome do ViPreço;
- **evidência técnica não substitui parecer jurídico.** Provar que uma página é legível não diz
  nada sobre poder lê-la;
- um registro **[C]** de uma fonte **[J]** continua sem autorizar acesso.

---

## 10. Estado dos estudos anteriores

### [F] Existência relatada

O Founder/PMO relatou a existência de dois estudos:

| #   | Estudo                    | Fontes cobertas                     | Relatório esperado                   |
| --- | ------------------------- | ----------------------------------- | ------------------------------------ |
| 1   | plano técnico             | Pague Menos, São Vicente, Carrefour | `plano-coleta-automatica-ofertas.md` |
| 2   | investigação complementar | Savegnago, Atacadão                 | `investigacao-savegnago-atacadao.md` |

### NOT LOCATED

Os arquivos não foram encontrados no repositório, nos refs, nos stashes nem nos caminhos
inspecionados durante R0.5. O registro dos caminhos exatos está em
[`../../post-mvp/SOURCE-CONNECTOR-STATUS.md`](../../post-mvp/SOURCE-CONNECTOR-STATUS.md) §4.

**Isto não afirma que os estudos nunca existiram.** É ausência de evidência localizável — não
evidência de ausência. Eles podem existir fora do repositório.

### NOT VERIFIED

Os achados técnicos não foram reproduzidos. Nenhuma fonte foi acessada. Nenhum achado do
handoff é promovido a **[C]**.

### Espaço reservado

Quando localizados, os relatórios entram **aqui**, versionados, com o bloco de metadados de §4
preenchido e classificação atribuída pelos critérios de §5 e §6 — não pela procedência do
arquivo. Um relatório antigo sem método reproduzível entra como **[H]**, e isso não é demérito:
é a classificação correta.

Alternativa igualmente válida: **substituí-los por evidência reproduzível nova**. O que não
serve é continuar decidindo com base num documento que ninguém consegue abrir.

**Não recriar os relatórios por suposição.** Um arquivo com o nome certo e conteúdo inventado é
pior do que a ausência: a ausência é honesta.

| Estado                                              | Rastreado em                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| relatórios localizados, versionados ou substituídos | **PM-DATA-02** · **TD-009**                                                    |
| bloqueia qualquer spike pós-MVP até ser resolvido   | [`../../pmo/TECHNICAL-DEBT-REGISTER.md`](../../pmo/TECHNICAL-DEBT-REGISTER.md) |

---

## 11. O que esta pasta não é

- **não é** autorização para acessar fonte;
- **não é** lugar de dado real de preço — dado de preço vive no banco, com procedência própria;
- **não é** lugar de arquivo pessoal, credencial ou material de terceiro sem origem;
- **não é** substituto de parecer jurídico;
- **não é** registro de decisão — decisão vive em
  [`../../pmo/MVP-DECISION-LOG.md`](../../pmo/MVP-DECISION-LOG.md).
