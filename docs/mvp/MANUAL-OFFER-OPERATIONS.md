# Operação manual de ofertas — Teste MVP asset-light

**Escopo:** o backstage mínimo para demonstrar e, depois de autorizado, testar o produto
(`docs/mvp/TEST-MVP-PLAN.md`, Gate V0/A2). Não existe painel administrativo, fila,
autenticação de comerciante ou automação de WhatsApp nesta fase — tudo abaixo é executado
manualmente pelo Founder, com as ferramentas que já usa (WhatsApp + planilha).

**Enquanto o Gate V0 estiver em avaliação, nenhuma oferta real é publicada** — este
documento descreve o processo para quando o Founder autorizar dados sintéticos de
demonstração mais realistas ou, mais adiante, o Gate V2 com um comerciante real.

> **SUPERSEDED FOR MVP PRODUCT SCOPE BY ROADMAP-MVP-v3** (02/08/2026) — **por incompletude**, não
> por contradição. Tudo o que está abaixo continua correto. Faltam três passos que o v3 exige e que
> serão acrescentados em R9 (card MVP-DOCS-06): **conferir a imagem**
> (`docs/data/IMAGE-POLICY.md` §4), **estruturar a promoção**
> (`docs/data/PROMOTION-TYPES.md`) e **marcar esgotado ou encerrado**
> (`docs/data/OFFER-STATES.md`).
>
> Registro honesto do estado atual: publicar uma oferta hoje é **executar SQL à mão no editor do
> Supabase**. Não há painel, e não deve haver. O que precisa existir antes de qualquer dado real é
> um script versionado de publicação — card MVP-BUSINESS-02.

---

## 1. Modelo de mensagem de WhatsApp para recebimento de oferta

Mensagem que o Founder envia ao comerciante (ou modelo que o comerciante segue ao
mandar espontaneamente):

```
Oi! Pra colocar uma oferta no ViPreço hoje, me manda:

1. Nome do produto (marca, tipo e tamanho — ex.: "Café Pilão tradicional 500 g")
2. Preço (ex.: "R$ 14,90")
3. Até quando vale (ex.: "até sábado" ou "enquanto durar o estoque")
4. Uma foto da etiqueta ou da nota, se tiver à mão

Pode mandar por áudio ou texto, do jeito que for mais fácil.
```

## 2. Formato mínimo dos dados

Antes de publicar, o Founder confirma que a mensagem recebida tem, no mínimo:

| Campo                            |                   Obrigatório                    | Exemplo                        |
| -------------------------------- | :----------------------------------------------: | ------------------------------ |
| Produto (nome + marca + tamanho) |                       Sim                        | "Café Pilão tradicional 500 g" |
| Preço                            |                       Sim                        | R$ 14,90                       |
| Mercado                          | Sim (já conhecido pelo cadastro do comerciante)  | Mercado Bairro Verde           |
| Validade                         | Não — se ausente, assume-se "até revisão manual" | "até sábado"                   |
| Evidência (foto/nota)            |     Recomendado, não obrigatório nesta fase      | foto da etiqueta               |

Se faltar produto ou preço, a oferta **não é publicada** — o Founder responde pedindo o
dado que falta.

## 3. Checklist de revisão antes de publicar

1. O produto já existe no catálogo (`products`)? Se não, confirmar marca/variante/tamanho
   exatos antes de criar um novo registro — nunca misturar tamanhos diferentes
   (`CLAUDE.md` princípio #1).
2. O preço está plausível (não é um erro de digitação óbvio, ex.: faltou uma casa
   decimal)?
3. O mercado já está cadastrado (`markets`)? Se não, confirmar nome, bairro e, se
   houver, link do Google Maps antes de criar.
4. A validade faz sentido (não está no passado)?
5. Existe algum preço mais recente do mesmo produto no mesmo mercado? Se sim, o mais
   recente substitui o anterior na comparação — não apagar o histórico, só publicar o
   novo.

## 4. Regra de validade e expiração

- Se o comerciante informar uma data, usar essa data como `valid_until`.
- Se não informar, o Founder revisa manualmente em até 7 dias e confirma se a oferta
  continua válida, atualiza ou marca como encerrada.
- Nenhuma oferta fica publicada por mais de 30 dias sem reconfirmação manual — mesmo
  critério de janela usado na simulação de dedup fiscal já preparada para o Roadmap B
  (`docs/strategy/POST-VALIDATION-PARKING-LOT.md`, PR #19).

## 5. Procedimento de correção

1. Comerciante ou consumidor avisa pelo mesmo canal (WhatsApp) que um preço está
   errado.
2. Founder confere a informação nova contra a fonte (mensagem original, nova consulta ao
   comerciante).
3. Founder atualiza o registro diretamente — sem fila de aprovação, porque nesta fase só
   o Founder publica.
4. Se o erro já tinha sido publicado por mais de 24h, registrar no log de alterações
   (item 8) para acompanhar a frequência de erros.

## 6. Modelo de card

O card compartilhável usa exatamente o que já está implementado no produto — mesmo
componente que qualquer oferta pública (`docs/mvp/TEST-MVP-PLAN.md`, entregável 1):
produto, mercado, bairro, preço, validade e origem juntos, nunca informação isolada. Ver
exemplo estático na rota `/para-mercados` (seção "Como sua oferta aparece para o
consumidor").

## 7. Exemplo de relatório semanal

Modelo simples que o Founder monta manualmente (planilha) e compartilha com o comerciante
uma vez por semana:

| Métrica                                      | Exemplo                     |
| -------------------------------------------- | --------------------------- |
| Ofertas publicadas na semana                 | 3                           |
| Vezes que o mercado apareceu numa comparação | 48                          |
| Vezes em que o mercado tinha o menor preço   | 21                          |
| Observações                                  | Nenhuma reclamação recebida |

Nenhuma dessas métricas é instrumentada automaticamente nesta fase — são contadas à mão
a partir do que foi publicado na semana. Automatizar a coleta é trabalho do Roadmap B, só
depois de confirmado que o relatório em si tem valor para o comerciante (princípio
obrigatório #9 do mandato: nenhuma automação sem hipótese previamente validada).

## 8. Registro mínimo de alterações

Uma planilha simples (fora do repositório, sem dado sensível) com uma linha por
alteração: data, produto, mercado, o que mudou (preço/validade/correção), quem confirmou.
Serve para auditoria informal e para alimentar o relatório semanal do item 7 — não é um
sistema, é uma lista.

## 9. Instrução para dados sintéticos

- Toda oferta usada para demonstração (não confirmada com um comerciante real) usa
  `is_demo = true` e nomes de mercado obviamente fictícios, seguindo o padrão já usado em
  `supabase/seed.sql` ("Mercado principal", "Mercado local 2" etc. — nunca nome de
  mercado real, conforme `CLAUDE.md`).
- Nenhuma oferta sintética é apresentada como se fosse real em nenhum material voltado ao
  Founder ou a terceiros — o banner de demonstração (`PriceDisclaimer`,
  `showDemoNotice`) permanece obrigatório enquanto os dados forem fictícios.
- Nenhum dado sintético usa nome, telefone, CPF ou endereço de pessoa real.
