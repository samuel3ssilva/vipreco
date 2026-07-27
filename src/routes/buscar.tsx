import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/buscar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Buscar produto — Preço Artemis" },
      {
        name: "description",
        content:
          "Busque por nome, marca, variante, tamanho ou código de barras e compare o mesmo produto entre mercados de Artemis.",
      },
      { property: "og:title", content: "Buscar produto — Preço Artemis" },
      {
        property: "og:description",
        content: "Encontre o produto exato e compare preços recentes cadastrados em Artemis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl">Buscar produto</h1>
          <p className="meta-text mt-1 max-w-2xl text-sm">
            Comparamos apenas produtos iguais: mesma marca, mesma variante e mesmo tamanho. Tamanhos
            diferentes aparecem separados.
          </p>
        </div>
        <ProductSearch autoFocus inline initialTerm={q ?? ""} label="O que você procura?" />
        <PriceDisclaimer />
      </div>
    </AppShell>
  );
}
