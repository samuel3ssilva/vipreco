import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/PageContainer";
import { StagingBanner } from "@/components/StagingBanner";
import { PILOT_LOCALITY } from "@/lib/pilot";

/**
 * A casca de `/para-mercados`. Ela existe para NÃO ser o app do consumidor.
 *
 * =============================================================================
 * POR QUE UM SHELL PRÓPRIO, E NÃO UM `AppShell` COM PARTES DESLIGADAS
 * =============================================================================
 *
 * Até 06/08/2026 a rota usava o `AppShell`, e a captura do Gate mostrou o problema: um dono de
 * mercado lendo a proposta via, encostada no polegar, uma barra com **Achados · Buscar · Ajuda ·
 * Mercados** — e a aba "Mercados" marcada como a página em que ele estava. A leitura natural é
 * que ele entrou no aplicativo do consumidor e está numa seção dele.
 *
 * Não é. `/para-mercados` é uma **landing page B2B separada**, e o contrato aprovado diz isso
 * com todas as letras: rota separada, **nunca** aba do app B2C
 * (`NORTH-STAR-V2-ASSESSMENT.md` §3, item 5).
 *
 * A alternativa seria passar bandeiras ao `AppShell` — `semBarraInferior`, `semBuscar`,
 * `semAbas` — até sobrar só o logotipo. Isso é o mesmo componente com quatro condicionais
 * novas, cada uma delas um caminho a mais para a Home quebrar sem que ninguém perceba. O
 * `AppShell` não foi tocado, e o guarda de `git` prova que a Home, a busca e a comparação saem
 * byte a byte iguais às da `main`.
 *
 * O QUE ESTE SHELL TEM: logotipo, o conteúdo, um link discreto para a experiência do
 * consumidor e um rodapé que diz onde é o piloto.
 *
 * O QUE ELE NÃO TEM, E É DELIBERADO: barra inferior, aba "Mercados", aba "Ajuda", botão
 * principal "Buscar" no cabeçalho, e qualquer navegação que faça o lojista pensar que está
 * dentro da jornada do consumidor.
 *
 * O `StagingBanner` fica. Ele é a primeira coisa que diz que isto não é a versão pública, e a
 * página é lida por quem precisa saber disso antes de qualquer outra coisa.
 */
export function MarketShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <StagingBanner />

      {/* O cabeçalho tem UM elemento clicável, e ele é a marca. Nenhuma aba, nenhum botão de
          busca: a única ação desta página é o convite para conversar, e ele mora no conteúdo.
          Um segundo botão no cabeçalho competiria com o CTA da primeira dobra a 390 px. */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <PageContainer className="flex items-center justify-between gap-3 py-2">
          {/* A marca leva para a Home do consumidor, e o rótulo acessível diz isso. Um
              logotipo que não leva a lugar nenhum quebra a expectativa de todo mundo; um que
              leva sem avisar tira o lojista da página sem ele entender por quê. */}
          <Link
            to="/"
            aria-label="ViPreço, página inicial para moradores"
            className="flex min-h-12 min-w-0 items-center gap-1.5"
          >
            <img
              src="/logo/vipreco-simbolo.svg"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="size-6 shrink-0"
            />
            {/* Mesma composição tipográfica do AppShell, e pela mesma razão de contraste:
                text-xl + font-extrabold forma o par "texto grande" do WCAG, onde #4E8570
                mede 4.27:1 contra branco. Não reutilizar essa cor abaixo deste tamanho. */}
            <span
              className="font-display truncate text-xl font-extrabold"
              style={{ letterSpacing: "-0.035em" }}
            >
              <span className="text-foreground">Vi</span>
              <span style={{ color: "#4E8570" }}>Preço</span>
            </span>
          </Link>

          {/* Rótulo, não botão. Ele diz de quem é esta página, e é a segunda coisa que o
              lojista lê depois da marca. */}
          <span className="meta-text shrink-0 whitespace-nowrap">Para mercados</span>
        </PageContainer>
      </header>

      <main id="conteudo" className="flex-1 py-4">
        <PageContainer>{children}</PageContainer>
      </main>

      <footer className="mt-8 border-t border-border bg-card">
        <PageContainer className="flex flex-col gap-3 py-6">
          <p className="meta-text">
            ViPreço. Comparador de preços de supermercado em preparação para {PILOT_LOCALITY}.
          </p>
          {/* O LINK DISCRETO PARA O CONSUMIDOR, e ele é discreto de propósito.
              O lojista precisa poder ver o que o morador vê; ele não precisa ser levado para
              lá. Por isso o link vive no rodapé, em peso de texto, e não numa aba encostada no
              polegar. */}
          <p className="text-sm">
            <Link to="/" className="text-primary underline underline-offset-2">
              Ver a experiência do morador
            </Link>{" "}
            <span className="text-muted-foreground">
              é a mesma página que o consumidor abre em {PILOT_LOCALITY}.
            </span>
          </p>
        </PageContainer>
      </footer>
    </div>
  );
}
