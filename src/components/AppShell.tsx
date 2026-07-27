import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search, HelpCircle } from "lucide-react";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/buscar", label: "Buscar produto", icon: Search },
  { to: "/como-funciona", label: "Como funciona", icon: HelpCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl font-semibold text-primary">
            Preço Artemis
          </Link>
          <nav aria-label="Navegação principal" className="hidden gap-1 sm:flex">
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
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 sm:pb-10">
        {children}
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card sm:hidden"
      >
        <ul className="mx-auto flex max-w-3xl">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-muted-foreground"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  <Icon aria-hidden="true" className="size-6" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
