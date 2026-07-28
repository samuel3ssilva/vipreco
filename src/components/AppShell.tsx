import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search, HelpCircle } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";

const NAV = [
  { to: "/", label: "Início", short: "Início", icon: Home },
  { to: "/buscar", label: "Buscar produto", short: "Buscar", icon: Search },
  { to: "/como-funciona", label: "Como funciona", short: "Ajuda", icon: HelpCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <PageContainer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
          <Link to="/" className="font-display truncate text-lg font-bold text-primary">
            ViPreço
          </Link>
          <nav aria-label="Navegação principal" className="hidden gap-0.5 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface"
                activeProps={{ className: "bg-surface text-surface-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
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
