import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Search, ListChecks, ShoppingCart, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AlertBanner } from "@/components/AlertBanner";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona — ViPreço" },
      {
        name: "description",
        content:
          "Entenda de onde vêm os preços do ViPreço, como os produtos são comparados e o que conferir antes de comprar.",
      },
      { property: "og:title", content: "Como funciona — ViPreço" },
      {
        property: "og:description",
        content:
          "De onde vêm os preços, como funciona a revisão das sugestões e o que o sistema não garante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    icon: Search,
    title: "1. Busque o produto",
    text: "Digite o nome, a marca ou o código de barras do que você quer comprar.",
  },
  {
    icon: ListChecks,
    title: "2. Compare os mercados",
    text: "Mostramos o preço válido mais recente de cada mercado, do menor para o maior.",
  },
  {
    icon: ShoppingCart,
    title: "3. Decida com contexto",
    text: "Veja a data, a fonte e a diferença em relação ao seu mercado habitual antes de ir à loja.",
  },
];

const DETAIL_GROUPS = [
  {
    title: "Como os preços chegam até você",
    items: [
      {
        title: "De onde vêm os preços",
        text: "Os preços vêm de notas fiscais, listas enviadas pelos mercados, pesquisa semanal em loja, fotos de etiqueta, informações da comunidade e ofertas anunciadas. Cada preço mostra a sua origem.",
      },
      {
        title: "Só comparamos produtos iguais",
        text: "Um produto só entra na mesma comparação quando marca, variante e tamanho são exatamente iguais. Café de 250 g e café de 500 g aparecem separados.",
      },
      {
        title: "Sugestões passam por revisão",
        text: "Quando alguém informa uma atualização pelo botão “Informar atualização”, o registro fica pendente e é conferido por uma pessoa antes de aparecer no comparador — ele não altera o preço publicado na hora.",
      },
    ],
  },
  {
    title: "Limites do sistema",
    items: [
      {
        title: "Preços vencidos saem da comparação",
        text: "Se uma oferta tem data de validade e essa data passou, o preço deixa de aparecer.",
      },
      {
        title: "Mostramos apenas o que está cadastrado",
        text: "O sistema tem apenas uma amostra dos preços da sua região. Existem mercados e produtos que ainda não foram cadastrados.",
      },
      {
        title: "O que não garantimos",
        text: "O sistema não garante estoque nem o menor preço da cidade. Ele mostra o menor preço entre os dados válidos que estão cadastrados.",
      },
    ],
  },
];

function HowItWorksPage() {
  const [open, setOpen] = useState<string | null>(DETAIL_GROUPS[0].items[0].title);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl">Como funciona</h1>
          <p className="meta-text mt-1 max-w-2xl text-sm">
            Em três passos você compara o mesmo produto entre os mercados da sua região.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="card-base">
                <Icon aria-hidden="true" className="size-5 text-primary" />
                <p className="mt-1.5 text-base font-bold">{step.title}</p>
                <p className="meta-text mt-0.5">{step.text}</p>
              </li>
            );
          })}
        </ol>

        <section aria-labelledby="detalhes-titulo" className="space-y-3">
          <h2 id="detalhes-titulo" className="font-display text-lg">
            Detalhes importantes
          </h2>
          {DETAIL_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h3 className="text-sm font-bold text-muted-foreground">{group.title}</h3>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {group.items.map((item) => {
                  const isOpen = open === item.title;
                  return (
                    <li key={item.title}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : item.title)}
                        className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2.5 text-left font-semibold hover:bg-surface"
                      >
                        <span className="min-w-0">{item.title}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen ? <p className="meta-text px-3 pb-3">{item.text}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="donos-titulo" className="card-compact bg-surface">
          <h2 id="donos-titulo" className="flex items-center gap-1.5 text-base font-bold">
            <Store aria-hidden="true" className="size-4 text-primary" />
            Você é dono de mercado?
          </h2>
          <p className="meta-text mt-0.5">
            Os preços do seu mercado entram no comparador do mesmo jeito que os dos outros: por nota
            fiscal, lista enviada por você, pesquisa em loja, foto de etiqueta ou informação da
            comunidade. Se algum preço mostrado sobre a sua loja estiver errado, use o botão
            “Informar atualização” na página do produto para reportar — a sugestão fica pendente e é
            conferida antes de substituir o preço publicado.
          </p>
        </section>

        <AlertBanner tone="atencao">
          Confira sempre a data, a fonte, a validade e a condição especial antes de comprar.
        </AlertBanner>

        <Link to="/buscar" className="btn-base btn-primary w-full sm:w-auto">
          Buscar um produto
        </Link>
      </div>
    </AppShell>
  );
}
