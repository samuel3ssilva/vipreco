# B2B-0 — evidência visual de `/para-mercados`

Capturas geradas em navegador de verdade por `scripts/visual/screenshot-para-mercados.ts`,
contra o servidor de desenvolvimento local.

| Arquivo                              | O que é                             | Viewport CSS | PNG (DPR 2) |
| ------------------------------------ | ----------------------------------- | ------------ | ----------- |
| `para-mercados-390.png`              | página inteira                      | 390 px       | 780 × 14890 |
| `para-mercados-430.png`              | página inteira                      | 430 px       | 860 × 14364 |
| `para-mercados-desktop.png`          | página inteira                      | 1280 px      | 2560 × 8442 |
| `para-mercados-comparison-board.png` | a rota anterior ao lado da proposta | 1400 px      | 2800 × 5422 |

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

O procedimento é o do checkpoint de 06/08/2026: `git stash` dos dois arquivos alterados,
captura com `--prefixo=antes --destino=<pasta temporária>`, `git stash pop`. A pasta temporária
**não é versionada** — o que fica no repositório é o painel, que já embute as duas imagens.

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
