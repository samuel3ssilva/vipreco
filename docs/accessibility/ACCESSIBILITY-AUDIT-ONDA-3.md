# Auditoria técnica de acessibilidade — Onda 3

Método: leitura integral de `src/routes/`, `src/components/` (exceto `src/components/ui/`,
boilerplate shadcn confirmado sem nenhum import ativo em código próprio), `src/styles.css` e
`src/lib/error-page.ts`. Alvo: WCAG 2.2 AA. Escopo estritamente técnico — nenhuma mudança de
identidade visual, arquitetura de tela ou reposicionamento de produto (Brand System v2 é tratado
à parte, ver `docs/security/` e a integração reversível de tokens desta mesma Onda).

## Corrigido nesta Onda

| #   | Achado                                                                                                                                                                                       | Critério WCAG                                                                                                                                   | Correção                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `--input` (borda de campo de formulário) media ~1.5:1 contra `--card`/`--background`, abaixo do 3:1 exigido para limites de componente em repouso                                            | 1.4.11 Non-text Contrast (AA)                                                                                                                   | `src/styles.css` — `--input` escurecido de `oklch(0.86 0.014 165)` para `oklch(0.6 0.02 165)` (mesmo hue), agora ≥3:1. Verificado visualmente via `wrangler dev` real (screenshot antes/depois da busca)                                                              |
| 2   | `<html lang="en">` em produto 100% pt-BR; páginas de erro/404 também em inglês                                                                                                               | 3.1.1 Language of Page (A)                                                                                                                      | `src/routes/__root.tsx` → `lang="pt-BR"`; `NotFoundComponent`/`ErrorComponent` traduzidos; `src/lib/error-page.ts` (fallback pré-hidratação) também traduzido e com `lang="pt-BR"`                                                                                    |
| 3   | Diálogo de sugestão de preço (`SubmitPriceForm`) não ocultava o resto da página da árvore de acessibilidade — um leitor de tela podia navegar para o header/nav por trás do overlay "aberto" | 2.4.3 Focus Order / 4.1.2 Name, Role, Value                                                                                                     | `AppShell` ganhou prop `inert`, aplicada ao `header` e à `nav` inferior (não ao `<main>`, que contém o próprio diálogo); `produto.$productId.tsx` passa `inert={showForm}` e também marca o `<div>` de conteúdo da página como `inert` enquanto o diálogo está aberto |
| 4   | Grupo de rádio "Fonte da informação" tinha `<p id>` de erro sem nada apontando para ele — só os outros três campos tinham `aria-describedby`                                                 | 3.3.1 Error Identification / 4.1.2                                                                                                              | `SubmitPriceForm.tsx` — `aria-describedby` adicionado ao `<fieldset>`                                                                                                                                                                                                 |
| 5   | Páginas de 404/erro de rota não usavam nenhum landmark (`<main>`) — diferente de toda rota real                                                                                              | 2.4.1 Bypass Blocks                                                                                                                             | Ambos os componentes em `__root.tsx` agora renderizam dentro de `<main>`                                                                                                                                                                                              |
| 6   | Links de navegação do header desktop ficavam abaixo da barra de 44px que o resto do app já usa (`btn-base`/`btn-sm`, nav inferior)                                                           | Critério interno do projeto (CLAUDE.md §10) — não é falha de WCAG 2.2 AA (mínimo é 24×24px, já atendido), mas é a barra de aceite deste produto | `AppShell.tsx` — `min-h-11` + `flex items-center` nos links do nav desktop                                                                                                                                                                                            |

Todas as seis correções são puramente técnicas: nenhuma mudança de cor de marca, tipografia,
copy (além da tradução) ou layout foi feita além do necessário para o critério específico.

## Verificado e já correto (sem ação necessária)

- Skip link funcional (`AppShell.tsx`) para `<main id="conteudo">`.
- Landmarks `header`/`nav`/`main` corretos em toda rota real; duas `<nav>` mutuamente exclusivas
  por breakpoint (desktop/mobile), sem landmark duplicado exposto ao mesmo tempo.
- Hierarquia de headings consistente (um único `h1` por rota, sem pular nível) nas quatro rotas
  reais e nos componentes aninhados.
- Todo input tem `<label htmlFor>` real; grupo de rádio usa `<fieldset>`/`<legend>` com `<label>`
  por opção.
- Nenhum ícone interativo sem nome acessível — ícones decorativos são `aria-hidden`, sempre
  acompanhados de texto visível ou `sr-only`.
- Nenhuma comunicação só-por-cor: `AlertBanner`, `SourceBadge`, `PriceCard`/`PriceSummary` sempre
  pareiam cor com ícone e/ou rótulo escrito (com comentário explícito no código nesse sentido).
- Estados de carregamento/erro/vazio centralizados em `StateMessage` (`role="status"`/`"alert"` +
  `aria-live="polite"`), reutilizado de forma consistente.
- Alvos de toque ≥44px em praticamente todo o app via `btn-base`/`btn-sm` (nav inferior mobile
  usa 56px) — única exceção era o nav desktop, corrigida nesta Onda.
- Contraste de texto: todos os pares texto/fundo do design system atual atingem AA, a maioria
  acima de 7:1 (AAA).
- Foco visível global (`:focus-visible`, 2px outline + 2px offset, nunca removido silenciosamente
  em código próprio).
- Diálogo de sugestão de preço: `role="dialog"`, `aria-modal`, `aria-labelledby`, foco movido ao
  abrir e devolvido ao fechar, `Tab`/`Shift+Tab` corretamente ciclados, `Escape` fecha — a única
  lacuna real era a falta de `inert` no restante da página (corrigida, item 3 acima).
- Nenhuma imagem no app (nem `<img>`, nem SVG de logo inline) — zero risco de alt-text ausente.
- Links externos que abrem em nova aba divulgam isso via texto `sr-only` ("abre em nova aba").

## Achados registrados, não corrigidos nesta Onda (não bloqueantes)

| Achado                                                                                                                                                                                                                            | Critério                                                                                                    | Por que ficou de fora                                                                                                                                                                                                                                                                                | Recomendação futura                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductSearch` usa `role="combobox"`/`"listbox"`/`"option"` mas a interação real é uma lista de botões focáveis via Tab, não o padrão de combobox com `aria-activedescendant` — semântica anunciada não bate com o comportamento | 4.1.2 Name, Role, Value                                                                                     | É funcionalmente operável por teclado hoje (só não segue a convenção exata que os papéis ARIA prometem); corrigir direito significa reescrever a navegação por setas ou remover os papéis ARIA — mudança de comportamento, não so de marcação, fora do escopo de "menor mudança possível" desta Onda | Nesta Onda futura de UI: ou implementar o padrão combobox completo (foco fica no input, `aria-activedescendant`, setas), ou simplesmente remover os papéis combobox/listbox/option e tratar como lista de resultados rotulada (mantendo o `aria-live` de contagem já existente) |
| Sem bloco `@media (prefers-reduced-motion: reduce)` em `src/styles.css`                                                                                                                                                           | 2.3.3 Animation from Interactions (AAA, não obrigatório em AA)                                              | Único CSS de animação em uso é um spinner de carregamento (`animate-spin`) e uma rotação de chevron — ambos de baixa severidade mesmo sem essa regra                                                                                                                                                 | Adicionar a regra global é barato; registrado para a próxima passada de polimento                                                                                                                                                                                               |
| Token `--border` (separador decorativo de cards) mede ~1.3:1 contra `--card`                                                                                                                                                      | Não é SC 1.4.11 (é decorativo, reforçado por `box-shadow`, não é o único indicador de limite de componente) | Não é uma falha técnica — registrado só por pertencer à mesma família de token do achado 1                                                                                                                                                                                                           | Nenhuma ação necessária                                                                                                                                                                                                                                                         |

## Escopo explicitamente fora desta Onda

Conforme o mandato: nenhuma mudança de rebranding, novo logo, nova paleta, nova arquitetura
visual, telas de "Achados do dia" ou implementação do Brand Book v2 foi feita aqui. A adoção
reversível dos tokens do Brand System v2 (incluindo o recálculo de contraste WCAG dos novos
tokens `--vp-*`) é tratada separadamente.
