import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { SearchResultCard } from "@/components/SearchResultCard";
import { StateMessage } from "@/components/StateMessage";
import { DemoNote } from "@/components/DemoNote";
import { appMode } from "@/lib/app-mode";
import { buscarProdutos, resumirBusca } from "@/services/demo-source";

const searchSchema = z.object({ q: z.string().optional() });

/**
 * =============================================================================
 * TELA 2 DO NORTH STAR — RESULTADOS DA BUSCA
 * =============================================================================
 *
 * A rota anterior era um cabeçalho, uma frase explicativa e um campo que abria um painel de
 * sugestões. Ela nunca foi uma **página de resultados**: era um autocomplete com moldura.
 *
 * Agora ela é o que a referência mostra — barra de busca no topo, a consulta visível, um título
 * curto, e a partir daí só produto: embalagem grande, identidade exata, preço verde e um CTA
 * verde por card.
 *
 * OS RESULTADOS VÊM DO LOADER, e não de `useQuery` no cliente (§9). Numa demonstração, o
 * intervalo entre a tela pintar e o dado chegar é o intervalo em que alguém pergunta "travou?".
 * Com o loader, o HTML já sai pronto — e o caminho é o mesmo em `/buscar?q=café`, que é como o
 * atalho da Home chega aqui.
 */
export const Route = createFileRoute("/buscar")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q ?? "" }),
  loader: async ({ deps }) => {
    const termo = deps.q.trim();
    if (termo.length < 2) return { termo, resultados: [] };
    const source = appMode();
    const produtos = await buscarProdutos(termo, source);
    return { termo, resultados: await resumirBusca(produtos, source) };
  },
  head: ({ loaderData }) => {
    const termo = loaderData?.termo ?? "";
    const title = termo ? `"${termo}" — Buscar produto | ViPreço` : "Buscar produto — ViPreço";
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Busque por nome, marca, variante ou tamanho e compare o mesmo produto entre os mercados monitorados em Artemis.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Encontre o produto exato e compare o preço observado em cada mercado.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SearchPage,
  errorComponent: () => (
    <AppShell>
      <StateMessage
        variant="error"
        title="Não conseguimos buscar agora."
        description="Verifique sua conexão e tente novamente."
        onRetry={() => window.location.reload()}
      />
    </AppShell>
  ),
});

function SearchPage() {
  const { termo, resultados } = Route.useLoaderData();

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4">
        {/* CABEÇALHO COMPACTO: uma seta e o campo, na mesma linha — a referência não gasta uma
            faixa inteira com um título de página que o campo logo abaixo já explica. */}
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label="Voltar para os Achados"
            className="btn-base btn-quiet size-12 shrink-0 rounded-full p-0"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <ProductSearch
              semSugestoes
              autoFocus={!termo}
              initialTerm={termo}
              destaque
              label="Busque um produto exato"
            />
          </div>
        </div>

        <h1 className="sr-only">Buscar produto</h1>

        {termo.length < 2 ? (
          <div className="space-y-2 pt-2">
            <p className="text-muted-foreground flex items-start gap-2 text-sm">
              <Search aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Digite o nome do produto — por exemplo, café, arroz ou leite.
            </p>
          </div>
        ) : resultados.length === 0 ? (
          <StateMessage
            variant="empty"
            title={`Nenhum produto encontrado para "${termo}".`}
            description="Tente outro nome, ou volte para os Achados."
            action={
              <Link to="/" className="btn-base btn-secondary btn-touch-48">
                Ver os Achados
              </Link>
            }
          />
        ) : (
          <>
            <div>
              <h2 className="font-display text-xl leading-tight font-bold">
                Resultados para “{termo}”
              </h2>
              {/* UMA LINHA, E ELA CARREGA A TESE. A referência diz "produtos exatos
                  encontrados"; aqui a frase também explica por que são vários cards e não um. */}
              <p className="text-muted-foreground mt-0.5 text-sm">
                {resultados.length === 1
                  ? "1 produto exato."
                  : `${resultados.length} produtos exatos. Marcas e tamanhos diferentes não se misturam.`}
              </p>
            </div>

            <ul className="space-y-3">
              {resultados.map((resumo) => (
                <SearchResultCard key={resumo.product.id} resumo={resumo} />
              ))}
            </ul>

            <DemoNote />
          </>
        )}
      </div>
    </AppShell>
  );
}
