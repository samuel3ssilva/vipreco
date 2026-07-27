import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona — Preço Artemis" },
      {
        name: "description",
        content:
          "Entenda de onde vêm os preços do Preço Artemis, como os produtos são comparados e o que conferir antes de comprar.",
      },
      { property: "og:title", content: "Como funciona — Preço Artemis" },
      {
        property: "og:description",
        content: "De onde vêm os preços, como funciona a revisão das sugestões e o que o sistema não garante.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const ITEMS = [
  {
    title: "De onde vêm os preços",
    text: "Os preços são cadastrados a partir de diferentes fontes: notas fiscais, listas enviadas pelos mercados, pesquisa semanal, fotos de etiqueta, informações da comunidade e ofertas anunciadas.",
  },
  {
    title: "Só comparamos produtos iguais",
    text: "Um produto só entra na mesma comparação quando marca, variante e tamanho são exatamente iguais. Café de 250 g e café de 500 g aparecem separados.",
  },
  {
    title: "Sugestões passam por revisão",
    text: "Quando alguém informa uma atualização, o registro fica guardado como pendente e é conferido por uma pessoa antes de aparecer no comparador.",
  },
  {
    title: "Preços vencidos saem da comparação",
    text: "Se uma oferta tem data de validade e essa data passou, o preço deixa de aparecer.",
  },
  {
    title: "Mostramos apenas o que está cadastrado",
    text: "O sistema tem apenas uma amostra dos preços de Artemis. Existem mercados e produtos que ainda não foram cadastrados.",
  },
  {
    title: "Confira antes de comprar",
    text: "Sempre olhe a data da observação, a fonte, a validade e a condição especial antes de decidir.",
  },
  {
    title: "O que não garantimos",
    text: "O sistema não garante estoque nem o menor preço da cidade. Ele mostra o menor preço entre os dados válidos que estão cadastrados.",
  },
];

function HowItWorksPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl">Como funciona</h1>
        <ul className="space-y-3">
          {ITEMS.map((item) => (
            <li key={item.title} className="card-base">
              <h2 className="text-lg">{item.title}</h2>
              <p className="mt-1 text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ul>
        <Link to="/buscar" className="btn-base btn-primary w-full">
          Buscar um produto
        </Link>
      </div>
    </AppShell>
  );
}
