import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";

export const Route = createFileRoute("/buscar")({
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
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl">Buscar produto</h1>
          <p className="mt-2 text-muted-foreground">
            Compare somente produtos iguais: mesma marca, mesma variante e mesmo tamanho. Produtos com
            tamanhos diferentes aparecem separados.
          </p>
        </div>
        <ProductSearch autoFocus label="O que você procura?" />
        <PriceDisclaimer />
      </div>
    </AppShell>
  );
}
