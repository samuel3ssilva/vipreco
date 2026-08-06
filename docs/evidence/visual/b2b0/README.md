# B2B-0 — evidência visual de `/para-mercados`

> **Gate aprovado pelo Founder em 06/08/2026** sobre o head `053eab9`, e mergeado na `main`
> por [#93](https://github.com/samuel3ssilva/vipreco/pull/93) → **`dd350b7`**. Comentário canônico:
> [issuecomment-5205806747](https://github.com/samuel3ssilva/vipreco/pull/93#issuecomment-5205806747).
>
> As quatro capturas foram regeradas contra o head atualizado com a `main` do Card v2 e saíram
> **byte a byte idênticas** — o merge do #89 não toca esta rota.

Capturas geradas em navegador de verdade por `scripts/visual/screenshot-para-mercados.ts`,
contra o servidor de desenvolvimento local.

**Recapturadas em 06/08/2026**, depois do shell B2B e da copy decidida. Todas as imagens abaixo
mostram a página **sem a barra inferior do consumidor**.

| Arquivo                              | O que é                             | Viewport CSS | PNG (DPR 2) | SHA-256 (12)   |
| ------------------------------------ | ----------------------------------- | ------------ | ----------- | -------------- |
| `para-mercados-390.png`              | página inteira                      | 390 px       | 780 × 15178 | `b91ec135ad2b` |
| `para-mercados-430.png`              | página inteira                      | 430 px       | 860 × 14678 | `54c983ba8027` |
| `para-mercados-desktop.png`          | página inteira                      | 1280 px      | 2560 × 8682 | `4385ea61dee4` |
| `para-mercados-comparison-board.png` | a rota anterior ao lado da proposta | 1400 px      | 2800 × 5732 | `158631a295da` |

```bash
shasum -a 256 docs/evidence/visual/b2b0/*.png
```

Um `.painel-b2b0.tmp.html` de 4 MB tinha entrado na pasta e no commit anterior: o script escrevia
o HTML do painel aqui em vez de na pasta temporária do sistema, o nome começa com ponto, e um
`git add -A` versionou. O arquivo saiu, e o script passou a usar `mkdtemp`.

### A rota B2B saiu da casca do consumidor

A captura anterior mostrava, encostada no polegar, uma barra com **Achados · Buscar · Ajuda ·
Mercados**, e a aba "Mercados" marcada como a página atual. Um dono de mercado lê isso como
"entrei no aplicativo do consumidor e estou numa seção dele". Não é: o contrato aprovado diz rota
separada, **nunca** aba do app B2C.

`/para-mercados` passou a usar um shell próprio, `MarketShell`: marca, conteúdo, link discreto
para a experiência do morador no rodapé, e nada mais. **Zero elementos `<nav>` na página**, medido
no navegador. O `AppShell` **não foi tocado** — o guarda de `git` em
`para-mercados.contract.test.ts` compara oito arquivos do consumidor com `origin/main` e reprova
se qualquer um deles tiver mudado.

O CTA fixo do mobile desceu junto: sem barra para sobrevoar, `alturaDaBarra` é zero e o botão
encosta na área segura do aparelho, em vez de flutuar 56 px acima de nada. O padrão do
`StickyCta` não mudou, então a Home continua com o comportamento de sempre.

### O que mudou de altura, e por quê

A página ganhou **176 px a 390 px** em relação à captura da manhã (15 002 → 15 178). O rodapé
próprio acrescenta; a frase isolada "o ViPreço ainda não está no ar", removida por decisão do
Founder/PMO, devolve parte. A soma é positiva e é o rodapé.

Para regerar:

```bash
bun run dev
bun scripts/visual/screenshot-para-mercados.ts
bun scripts/visual/comparison-board-para-mercados.ts --antes=<pasta com antes-390.png>
```

---

## O painel comparativo gera o "antes" na hora

O `ANTES` não é um PNG guardado: ele é produzido a partir do código de `origin/main`, com o
**mesmo script, no mesmo navegador, no mesmo instante**. Um "antes" capturado noutra ocasião
compararia duas coisas que diferem também em fonte, token e versão de navegador — e a
comparação atribuiria à mudança de copy diferenças que não são dela.

O procedimento mudou na recaptura de 06/08/2026, e mudou para melhor. Antes era `git stash` dos
arquivos alterados, captura, `git stash pop` — o que mexe na árvore de trabalho de quem está
rodando. Agora o "antes" sai de um **worktree efêmero** em `origin/main`:

```bash
git worktree add --detach <tmp> origin/main
ln -s "$PWD/node_modules" <tmp>/node_modules      # o worktree não tem dependências próprias
cp .env <tmp>/.env                                # o CTA falha fechado sem VITE_WHATSAPP_NUMBER
(cd <tmp> && bunx vite dev --port 8081)
bun scripts/visual/screenshot-para-mercados.ts http://localhost:8081 \
  --prefixo=antes --destino=<pasta temporária>
git worktree remove --force <tmp>
```

Os dois servidores sobem ao mesmo tempo, nas portas 8080 e 8081, e as duas capturas saem do mesmo
Chrome com minutos de diferença. A árvore de trabalho não é tocada em momento nenhum, o que
importa quando há mudança não commitada em cima da mesa.

A pasta temporária **não é versionada** — o que fica no repositório é o painel, que já embute as
duas imagens.

Medido nesta execução, no `origin/main` em `5217bdb`: a rota anterior tem **8 seções** e
**10058 px** de altura a 390 px; a proposta tem **11 seções** e **15002 px**.

---

## Medidas, e não só imagens

O script mede a página em cinco larguras e **falha** se qualquer uma reprovar. Medido nesta
execução:

| Largura | `scrollWidth` | `clientWidth` | Estoura? | Seções | `h1` | CTA | Alvos < 48 px |
| ------- | ------------- | ------------- | -------- | ------ | ---- | --- | ------------- |
| 320 px  | 320           | 320           | não      | 11     | 1    | 2   | 0             |
| 360 px  | 360           | 360           | não      | 11     | 1    | 2   | 0             |
| 390 px  | 390           | 390           | não      | 11     | 1    | 2   | 0             |
| 430 px  | 430           | 430           | não      | 11     | 1    | 2   | 0             |
| 1280 px | 1280          | 1280          | não      | 11     | 1    | 2   | 0             |

**`alvosPequenos` mede todo link e botão visível da página**, e não só o CTA. A versão herdada
do Card v2 media apenas `article a`, onde o único controle é o CTA; aqui há links de âncora, o
botão de voltar e dois convites de WhatsApp — e é justamente num deles que um `btn-touch-48`
esquecido passaria despercebido.

A rota anterior tinha **8 seções**; a proposta tem **11**. As três novas são "como o consumidor
encontra o seu mercado", "o que pedimos ao seu mercado" e "benefícios potenciais".

**As capturas são posteriores à revisão especializada** e já mostram as nove recomendações
adotadas — inclusive as duas de severidade alta que ela encontrou.

---

## O CTA nas capturas: número fictício, local, descartado

`MarketWhatsAppCta` **falha fechado**: sem `VITE_WHATSAPP_NUMBER` configurado, o bloco inteiro
some — botão e microcopy juntos. É o comportamento correto, e é o que o ambiente de
desenvolvimento tem por padrão: as primeiras capturas saíram com **0 CTA**.

Para a evidência mostrar a página que o Founder precisa revisar, a captura foi feita com
`VITE_WHATSAPP_NUMBER=5519000000000` no `.env` **local** — um número fictício, num arquivo que
está no `.gitignore`, restaurado ao valor anterior logo depois. Nenhum número real, de ninguém,
passou por aqui ou pelo repositório.

---

## O que estas imagens provam

- **Nenhuma captura de tela do produto na página.** O único exemplo visual é o card estático
  rotulado "Exemplo fictício". Uma imagem com cara de produto pronto, numa página que um
  lojista lê como proposta, promete um produto que não está no ar;
- **nenhum logotipo de mercado**, em nenhuma seção;
- **nenhum número** de usuário, tráfego, movimento ou resultado;
- **a neutralidade aparece por extenso e em destaque** — "Participar do ViPreço não compra
  posição no ranking." —, e não diluída numa lista de regras;
- **o espaço do QR Code está reservado no material offline**, com o motivo escrito. Nenhum QR
  foi gerado: ele depende de uma URL estável e aprovada, que só existe em R8.

---

## Limite desta evidência

Os scripts dependem do Chrome instalado na máquina de quem roda. **Não são reproduzíveis em CI
hoje**, e portanto não são gate — são evidência para revisão humana.

O que **é** gate roda no CI e não depende de navegador:
`src/routes/para-mercados.contract.test.ts` (o que não pode entrar na página) e
`src/routes/para-mercados.ssr.test.ts` (o que precisa sair no HTML do servidor, incluindo a
regra de que a interface pública não usa travessão).
