import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { SearchResultCard } from "@/components/SearchResultCard";
import { StateMessage } from "@/components/StateMessage";
import { DemoNote } from "@/components/DemoNote";
import { appMode } from "@/lib/app-mode";
import { SHORTCUTS } from "@/lib/atalhos-de-busca";
import { DEMO_PRODUCTS } from "@/lib/demo-catalog";
import { buscarProdutos, resumirBusca, type ResumoDeBusca } from "@/services/demo-source";

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
    const source = appMode();
    if (termo.length < 2) {
      // V3 §3/§7 — sem termo, a página é o CATÁLOGO: os 24 grupos comparáveis, por
      // categoria. Uma demo com um campo vazio dizia "temos pouco"; a lista inteira diz o
      // contrário, e diz com dado real. Só em modo demo: no piloto, listar a base inteira
      // é decisão de produto que não foi tomada.
      if (source !== "demo") return { termo, resultados: [], catalogo: [] };
      return { termo, resultados: [], catalogo: await resumirBusca([...DEMO_PRODUCTS], source) };
    }
    const produtos = await buscarProdutos(termo, source);
    return { termo, resultados: await resumirBusca(produtos, source), catalogo: [] };
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

/**
 * §10 do polish — a página de resultados continua um CATÁLOGO mesmo com um resultado só.
 *
 * Com 12 grupos, a maioria das buscas devolve 1–2 cards, e o que sobrava era fundo vazio.
 * Os mesmos atalhos da Home entram depois da lista como "Continue explorando": composição
 * intencional em vez de deserto, e nenhum dado novo — cada atalho já é garantido por teste
 * a devolver resultado. O atalho igual ao termo atual não aparece: oferecê-lo seria um
 * botão para a página em que a pessoa já está.
 */
function AtalhosDeExploracao({ termo }: { termo: string }) {
  const atalhos = SHORTCUTS.filter((s) => s.toLowerCase() !== termo.toLowerCase());
  if (atalhos.length === 0) return null;
  return (
    <nav aria-label="Continue explorando" className="space-y-2 pt-1">
      <h3 className="eyebrow">Continue explorando</h3>
      <ul className="flex flex-wrap gap-2">
        {atalhos.map((atalho) => (
          <li key={atalho}>
            <Link
              to="/buscar"
              search={{ q: atalho }}
              className="btn-base btn-secondary btn-touch-48 rounded-full px-4 text-sm font-semibold"
            >
              {atalho}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * V3 §3/§7 — o catálogo completo, agrupado por categoria, na página de busca sem termo.
 *
 * A ordem das categorias e dos produtos é a do próprio catálogo (`DEMO_PRODUCTS`) — a
 * mesma sequência editorial da fonte, nenhuma curadoria nova aqui. Cada card é o MESMO
 * `SearchResultCard` dos resultados: o catálogo não é uma segunda anatomia, é a busca com
 * a pergunta em branco.
 */
function CatalogoCompleto({ catalogo, now }: { catalogo: ResumoDeBusca[]; now: Date }) {
  const categorias: [string, ResumoDeBusca[]][] = [];
  for (const resumo of catalogo) {
    const categoria = resumo.product.category ?? "Outros";
    const atual = categorias.find(([nome]) => nome === categoria);
    if (atual === undefined) categorias.push([categoria, [resumo]]);
    else atual[1].push(resumo);
  }
  return (
    <section aria-label="Catálogo da demonstração" className="space-y-5 pt-1">
      <div>
        <h2 className="font-display text-xl leading-tight font-bold">
          Todos os produtos comparados
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {catalogo.length} produtos em {categorias.length} categorias — cada um com a sua própria
          comparação entre mercados.
        </p>
      </div>
      {categorias.map(([categoria, itens]) => (
        <div key={categoria} className="space-y-2">
          <h3 className="eyebrow">{categoria}</h3>
          <ul className="space-y-3">
            {itens.map((resumo) => (
              <SearchResultCard key={resumo.product.id} resumo={resumo} now={now} />
            ))}
          </ul>
        </div>
      ))}
      <DemoNote />
    </section>
  );
}

function SearchPage() {
  const { termo, resultados, catalogo } = Route.useLoaderData();
  const now = useMemo(() => new Date(), []);

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
          <div className="space-y-4 pt-2">
            <p className="text-muted-foreground flex items-start gap-2 text-sm">
              <Search aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Busque pelo nome — por exemplo, cerveja, frango ou shampoo — ou navegue pelo catálogo
              abaixo.
            </p>
            {catalogo.length > 0 ? <CatalogoCompleto catalogo={catalogo} now={now} /> : null}
          </div>
        ) : resultados.length === 0 ? (
          <>
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
            <AtalhosDeExploracao termo={termo} />
          </>
        ) : (
          <>
            <div>
              <h2 className="font-display text-xl leading-tight font-bold">
                Resultados para “{termo}”
              </h2>
              {/* UMA LINHA, E ELA CARREGA A TESE — sem afirmar mais do que o catálogo
                  sustenta: os grupos de embalagens diferentes NÃO são "produtos exatos",
                  e a frase precisa servir aos dois casos. */}
              <p className="text-muted-foreground mt-0.5 text-sm">
                {resultados.length === 1
                  ? "1 produto comparável."
                  : `${resultados.length} produtos comparáveis. Cada um tem a sua própria comparação.`}
              </p>
            </div>

            <ul className="space-y-3">
              {resultados.map((resumo) => (
                <SearchResultCard key={resumo.product.id} resumo={resumo} now={now} />
              ))}
            </ul>

            <AtalhosDeExploracao termo={termo} />

            <DemoNote />
          </>
        )}
      </div>
    </AppShell>
  );
}
