import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search, HelpCircle, Store } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { StagingBanner } from "@/components/StagingBanner";

const NAV = [
  // "Achados" é o rótulo oficial da entrada principal (North Star v1.2.2). A rota continua "/".
  { to: "/", label: "Achados", short: "Achados", icon: Home },
  { to: "/buscar", label: "Buscar produto", short: "Buscar", icon: Search },
  { to: "/como-funciona", label: "Como funciona", short: "Ajuda", icon: HelpCircle },
  { to: "/para-mercados", label: "Para mercados", short: "Mercados", icon: Store },
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
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <StagingBanner />

      <header
        className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur"
        inert={isInert || undefined}
      >
        <PageContainer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
          <Link to="/" className="flex min-w-0 items-center gap-1.5">
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
            <nav aria-label="Navegação principal" className="flex gap-0.5">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface"
                  activeProps={{ className: "bg-surface text-surface-foreground" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* Entrada B2B do header (North Star v1.2.2): pill contornada no verde da ação,
                só no desktop — no mobile a barra inferior já leva a "Mercados". */}
            <Link
              to="/para-mercados"
              className="btn-base btn-sm shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-primary bg-card text-primary hover:bg-secondary"
            >
              Tenho um mercado
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <Link
            to="/buscar"
            aria-label="Buscar produto"
            className="btn-base btn-secondary btn-sm sm:hidden"
          >
            <Search aria-hidden="true" className="size-5" />
            <span>Buscar</span>
          </Link>
        </PageContainer>
      </header>

      <main id="conteudo" className="flex-1 pb-24 pt-4 sm:pb-12">
        <PageContainer>{children}</PageContainer>
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card sm:hidden"
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
