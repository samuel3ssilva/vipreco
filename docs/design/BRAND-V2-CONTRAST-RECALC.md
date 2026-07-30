# Brand System v2 — recálculo de contraste WCAG

Fonte: `vipreco-tokens-v2.json`/`.css` do pacote em
`~/Downloads/Estratégia de marca e identidade visual_new/` (fora do repositório Git, consultado
localmente conforme autorizado pelo anexo de aprovação do Brand System v2). Método: fórmula de
luminância relativa do WCAG 2.x (`L = 0.2126·R + 0.7152·G + 0.0722·B` sobre canais sRGB
linearizados) aplicada a cada par declarado em `color.contrast` do JSON, mais os pares
adicionais explicitamente sinalizados como suspeitos no mandato (`--vp-time-expired`,
`--vp-text-faint`). Nenhum valor foi aceito só por estar escrito no JSON — todos foram
recalculados a partir dos hex reais.

## Pares declarados no JSON — recalculados

| Par                | Cores                 | Declarado | Recalculado | Veredito                                                                                                              |
| ------------------ | --------------------- | --------: | ----------: | --------------------------------------------------------------------------------------------------------------------- |
| ink/cream          | `#10231C` / `#FBF7EC` |      15.3 |   **15.34** | bate                                                                                                                  |
| green/cream        | `#0E5C3C` / `#FBF7EC` |       7.4 |    **7.50** | bate (arredondamento)                                                                                                 |
| muted/cream        | `#5B6B63` / `#FBF7EC` |       5.2 |    **5.26** | bate                                                                                                                  |
| cream/green        | `#FBF7EC` / `#0E5C3C` |       7.4 |    **7.50** | bate (arredondamento)                                                                                                 |
| ink/yellow         | `#10231C` / `#F5C24B` |        10 |    **9.93** | bate (arredondamento)                                                                                                 |
| white/yellow       | `#FFFFFF` / `#F5C24B` |       1.6 |    **1.65** | bate — **listado no próprio pacote como proibido** ("texto branco sobre #F5C24B"), não é uma alegação de conformidade |
| timeSoon/cream     | `#8A4B12` / `#FBF7EC` |       6.1 |    **6.34** | bate, folga confortável acima de 4.5:1                                                                                |
| timeCritical/cream | `#B3311F` / `#FBF7EC` |       6.6 |    **5.81** | **valor declarado superestimado** — ainda passa AA (≥4.5:1) com folga, mas o número documentado estava errado         |
| timeExpired/cream  | `#6B7570` / `#FBF7EC` |       4.6 |    **4.45** | **FALHA** — abaixo do mínimo 4.5:1 para texto normal (ver correção abaixo)                                            |

## Achados adicionais verificados (não declarados no JSON)

| Par                                | Cores                 | Recalculado | Veredito                                                                                                                                                                                                                                                                   |
| ---------------------------------- | --------------------- | ----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--vp-text-faint` / cream (bgPage) | `#7A8880` / `#FBF7EC` |    **3.47** | Abaixo de AA para texto normal — mas o próprio pacote já documenta isso como regra ("`--vp-text-faint` não deve ser usado em texto normal quando não atingir AA"). Recálculo **confirma** que a restrição de uso é necessária e correta, não uma inconsistência a corrigir |
| `--vp-text-faint` / bgSubtle       | `#7A8880` / `#F1EFE4` |    **3.22** | Mesma conclusão — uso restrito a elementos grandes/decorativos, nunca texto de corpo                                                                                                                                                                                       |
| `--vp-time-now` / cream            | `#0E5C3C` / `#FBF7EC` |        7.50 | OK                                                                                                                                                                                                                                                                         |
| `--vp-time-today` / cream          | `#10231C` / `#FBF7EC` |       15.34 | OK                                                                                                                                                                                                                                                                         |

## Correção aplicada

**`--vp-time-expired`** (cor do estado "Encerrado" — rótulo, tarja e preço riscado) falha AA para
texto normal (4.45:1 < 4.5:1). Como este token é usado em rótulo textual pequeno (mono, ~13px) e
não em texto grande/negrito (que teria limiar 3:1), a falha é real e não um falso positivo por
tamanho de fonte.

Correção de menor mudança possível: `#6B7570` escurecido para `#656E69` (mesma família de cinza-
esverdeado, só a luminância ajustada) — recalculado em **4.92:1**, acima do mínimo com folga
para variação de renderização entre monitores.

| Token                    | Antes     | Depois    | Contraste antes | Contraste depois |
| ------------------------ | --------- | --------- | --------------: | ---------------: |
| `--vp-time-expired` (fg) | `#6B7570` | `#656E69` |            4.45 |         **4.92** |

Nenhuma outra cor semântica ou de marca central foi alterada. `--vp-time-critical` mantém o hex
original do pacote (`#B3311F`) — o problema ali era só o número documentado no JSON estar
otimista, a cor em si já passa AA com folga (5.81:1).

## Escopo desta correção

Este recálculo e a correção pontual valem para os tokens `--vp-*` **instalados nesta Onda como
conjunto inerte** em `src/styles.css` (ver seção "Brand System v2" no arquivo) — nenhum
componente da aplicação foi religado para consumir esses tokens ainda; a aparência atual do
produto está preservada. Fontes (self-host), logo/favicon/assinatura e a reestruturação de
telas (Achados do dia, etc.) permanecem como trabalho preparatório de uma trilha de produto
separada, fora desta Onda de segurança.
