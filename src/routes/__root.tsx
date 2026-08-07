import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { buildEhPublico, DIRETIVA_NAO_INDEXAR } from "@/lib/indexing";
import { ogImageMeta } from "@/lib/og";

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Você pode tentar de novo ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ViPreço" },
      {
        name: "description",
        content: "Compare preços recentes e verificados de supermercados da sua região.",
      },
      { name: "author", content: "ViPreço" },
      // A segunda camada do bloqueio, no próprio documento. O `X-Robots-Tag` já cobre toda
      // resposta do Worker; a `<meta>` cobre o caso de o HTML ser lido sem os headers —
      // salvo em disco, servido por outro proxy, aberto de um `file://` de uma captura.
      //
      // A condição é de BUILD, não de host: esta marcação é renderizada no servidor e
      // reavaliada na hidratação, e as duas precisam chegar ao mesmo valor. Ver a seção
      // "dois tempos" em `src/lib/indexing.ts`.
      ...(buildEhPublico() ? [] : [{ name: "robots", content: DIRETIVA_NAO_INDEXAR }]),
      { property: "og:title", content: "ViPreço" },
      {
        property: "og:description",
        content: "Compare preços recentes e verificados de supermercados da sua região.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ViPreço" },
      { property: "og:locale", content: "pt_BR" },
      ...ogImageMeta(),
      { name: "theme-color", content: "#0e5c3c" },
    ],
    links: [
      {
        // Brand System v2 "Visto" (docs/design/BRAND-V2-CONTRAST-RECALC.md): Bricolage
        // Grotesque na marca/títulos, Public Sans no corpo, IBM Plex Mono em dado
        // tabular (preço, contagem).
        //
        // As três famílias entram por `appCss` — os @import de @fontsource no topo de
        // src/styles.css. Não há mais <link> para fonts.googleapis.com nem preconnect
        // para fonts.gstatic.com: a mesma tipografia, servida pelo próprio build.
        // Os pesos importados são exatamente os que aquela URL pedia, para a Home
        // continuar desenhando o que desenhava.
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/logo/vipreco-favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/logo/vipreco-app-icon-1024.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
