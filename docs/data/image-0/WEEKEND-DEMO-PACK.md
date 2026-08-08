# Weekend demo pack — o que dá para usar neste fim de semana

**Resposta curta: já está pronto, e não depende de nada deste pacote.**

O §21 do mandato é explícito — "não bloquear a demo por não termos o pipeline definitivo" — e a
demonstração deste fim de semana usa apenas asset **próprio, genérico, fictício e versionado**.

---

## 1. O que existe e está pronto

| Asset                                                        | Onde               | Estado                           |
| ------------------------------------------------------------ | ------------------ | -------------------------------- |
| Três ilustrações genéricas de categoria (café, arroz, leite) | `public/img/demo/` | prontas, **na branch do PR #97** |
| Placeholder por categoria                                    | `ImagePlaceholder` | pronto, na `main`                |
| Card de exemplo do lojista, com imagem                       | `/para-mercados`   | pronto, **na branch do PR #99**  |

**As três ilustrações estão em branch não mergeada.** Para a demonstração isso não importa — o
Founder abre staging ou o servidor local da branch. Mas vale saber: **elas não estão na `main`**, e
portanto não estão no que está publicado hoje.

## 2. O que a demonstração mostra, e o que ela diz

| Tela                                | O que a imagem faz ali                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Home, card de destaque              | Ilustração de 96 px ao lado do nome e do preço. É o que faz a tela parecer produto e não relatório.                  |
| Home, "Outros Achados"              | Ilustração de 64 px. Aqui ela serve para **reconhecer** na rolagem, não para dominar.                                |
| `/para-mercados`, exemplo de oferta | Ilustração de 96 px, rotulada "Exemplo fictício". É a peça que faz o lojista pensar "minha oferta apareceria assim". |

## 3. A frase para dizer na entrevista

Se alguém perguntar sobre as imagens — e um dono de mercado vai perguntar:

> "Essas ilustrações são nossas e são genéricas, de propósito: são dados de demonstração. No piloto,
> cada produto ou tem uma foto do item exato, com a gramatura certa, conferida por uma pessoa, ou
> não tem foto nenhuma. A gente não coloca a foto do 1 kg num card de 500 g, porque aí o comparador
> deixa de servir para comparar."

É verdade, é conferível no código, e responde à pergunta de confiança antes de ela virar objeção.

## 4. O que NÃO fazer na demonstração

- **Não diga que são fotos.** O `alt` de cada uma já diz que é ilustração e que não é a embalagem do
  produto; a fala tem de bater com o que o produto declara.
- **Não coloque marca real ao lado de ilustração genérica.** O fixture usa marcas fictícias
  exatamente por isso: o nome faz o trabalho que o desenho se absteve de fazer.
- **Não prometa foto real para uma data.** O plano das 10 a 20 primeiras fotos existe
  ([`OPERACAO-FOTO.md`](./OPERACAO-FOTO.md) §5), mas depende da autorização do mercado, que é o que
  a entrevista está indo buscar.

## 5. Se der tempo antes da demonstração

Nada é obrigatório. Em ordem de retorno por esforço:

1. **Mergear o #97** — sem ele, a Home da `main` não tem ilustração nenhuma. _(Decisão do Founder,
   depende do Gate visual.)_
2. **Uma quarta ilustração, de feijão** — é o quarto chip da busca e o único dos quatro sem desenho.
   Meia hora, mesmo critério de 64 px.
3. **Deploy de staging das duas branches** — para a demonstração rodar de um link em vez de um
   servidor local. _(Depende de decisão de deploy, que o §29 desta missão proibiu.)_

## 6. Divergência aberta, que a demonstração precisa saber

`supabase/seed.sql` continua com as marcas antigas. **Em staging, a Home mostra "Serra Alta" e a
página do produto — que lê do banco — mostra a marca anterior.** Se a demonstração navegar da Home
para o detalhe do produto, a inconsistência aparece.

Alinhar exige **reseed**, que é banco, e banco está proibido por esta missão (§29). Duas saídas para
o fim de semana: demonstrar sem entrar no detalhe do produto, ou autorizar o reseed de staging antes.
**A decisão é do Founder.**
