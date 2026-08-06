import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { StagingBanner } from "@/components/StagingBanner";
import { PILOT_LOCALITY } from "@/lib/pilot";

/**
 * DUAS ABAS, E SÓ DUAS (R3.3, North Star V2 §3 itens 1, 2, 17 e 18).
 *
 * Eram quatro: Achados, Buscar, Ajuda e Mercados. As duas que saíram, saíram por motivos
 * diferentes, e vale registrar os dois:
 *
 * **"Mercados"** era a `/para-mercados` — uma landing B2B — vestida de seção do aplicativo do
 * consumidor. O contrato aprovado diz rota separada, NUNCA aba do app B2C. Foi ela que apareceu
 * na captura do gate de B2B-0, encostada no polegar de um dono de mercado lendo a proposta.
 *
 * **"Ajuda"** era `/como-funciona`, e o problema não é a página: é o custo de uma aba. Numa barra
 * de quatro, cada aba leva um quarto da largura e um quarto da atenção. Ajuda não é uma jornada
 * — é uma consulta pontual, e consulta pontual vive em link, não em aba.
 *
 * As duas continuam alcançáveis, pelo rodapé. Aba não é o único jeito de chegar a uma página; é
 * o jeito que declara "esta é uma das coisas principais que você faz aqui". Achar e comparar
 * preço são duas. Não há uma terceira.
 */
const NAV = [
  // "Achados" é o rótulo oficial da entrada principal (North Star v1.2.2). A rota continua "/".
  { to: "/", label: "Achados", short: "Achados", icon: Home },
  { to: "/buscar", label: "Buscar produto", short: "Buscar", icon: Search },
] as const;

export function AppShell({
  children,
  inert: isInert,
}: {
  children: ReactNode;
  /** Verdadeiro enquanto um diálogo modal (ex.: SubmitPriceForm) está aberto por cima —
   * oculta o restante da página da árvore de acessibilidade e do teclado. */
  inert?: boolean;
}) {
  // A pill é um convite para ir até `/para-mercados`. Estando lá, ela vira um botão que leva à
  // própria página — navegação circular, e uma ação a mais competindo com o CTA real da página.
  const naPaginaDeMercados = useRouterState({
    select: (state) => state.location.pathname === "/para-mercados",
  });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <StagingBanner />

      <header
        className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur"
        inert={isInert || undefined}
      >
        <PageContainer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
          <Link to="/" className="flex min-h-12 min-w-0 items-center gap-1.5">
            <img
              src="/logo/vipreco-simbolo.svg"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="size-6 shrink-0"
            />
            {/* text-xl + font-extrabold garante par "texto grande" do WCAG (>=18.66px + peso >=700);
                #4E8570 mede 4.27:1 contra branco — atende o mínimo de texto grande (3:1), não o de
                texto normal (4.5:1). Não reutilizar essa cor abaixo deste tamanho/peso. */}
            <span
              className="font-display truncate text-xl font-extrabold"
              style={{ letterSpacing: "-0.035em" }}
            >
              <span className="text-foreground">Vi</span>
              <span style={{ color: "#4E8570" }}>Preço</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            {/* Nome distinto do da barra inferior. Dois landmarks de navegação com o MESMO
                nome acessível ficam indistinguíveis na lista de regiões do leitor de tela —
                "Navegação principal" e "Navegação principal", e a pessoa escolhe no escuro.
                Só um dos dois está visível por vez, mas a árvore acessível não sabe disso. */}
            <nav aria-label="Navegação principal do cabeçalho" className="flex gap-0.5">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-12 items-center rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface"
                  activeProps={{ className: "bg-surface text-surface-foreground" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* Entrada B2B do header (North Star v1.2.2): pill contornada no verde da ação.
                Só a partir de `lg`: entre 640 e 1024 px ela espremia a marca a ponto de o
                logotipo virar "Vi…". Abaixo disso, "Para mercados" na navegação (desktop) e a
                barra inferior (mobile) já levam ao mesmo lugar. */}
            {naPaginaDeMercados ? null : (
              <Link
                to="/para-mercados"
                className="btn-base btn-sm btn-touch-48 hidden shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-primary bg-card text-primary hover:bg-secondary lg:inline-flex"
              >
                Tenho um mercado
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
          {/* O BOTÃO "BUSCAR" DO CABEÇALHO SAIU EM R3.3, e o motivo é aritmética de tela.
              Com a busca na primeira dobra da Home e "Buscar" como aba da barra inferior, o
              botão era a TERCEIRA forma de fazer a mesma coisa no mesmo viewport de 390 px —
              e as três brigavam pela mesma decisão nos primeiros cinco segundos. A aba fica
              porque está no polegar em todas as rotas; o campo fica porque é onde a busca
              acontece. O botão não tinha o que acrescentar. */}
        </PageContainer>
      </header>

      <main id="conteudo" className="flex-1 pt-4">
        <PageContainer>{children}</PageContainer>
      </main>

      {/* AS DUAS PÁGINAS QUE PERDERAM A ABA VIVEM AQUI, e o rodapé é o lugar certo para elas:
          alcançáveis para quem procura, silenciosas para quem não está procurando. A barra
          inferior reserva o polegar para as duas ações que o produto realmente é. */}
      <footer
        className="mt-10 border-t border-border bg-card pb-24 pt-6 sm:pb-6"
        inert={isInert || undefined}
      >
        <PageContainer className="flex flex-col gap-2">
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              to="/como-funciona"
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              Como funciona
            </Link>
            <Link
              to="/para-mercados"
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              Tenho um mercado
            </Link>
          </nav>
          <p className="meta-text">
            ViPreço. Comparador de preços de supermercado em preparação para {PILOT_LOCALITY}.
          </p>
        </PageContainer>
      </footer>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card sm:hidden"
        data-barra-inferior=""
        inert={isInert || undefined}
      >
        <ul className="mx-auto flex max-w-md">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-semibold text-muted-foreground"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span className="whitespace-nowrap">{item.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
