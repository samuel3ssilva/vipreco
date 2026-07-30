import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Store, Clock, UserCheck, Pencil, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AlertBanner } from "@/components/AlertBanner";
import { SourceBadge } from "@/components/SourceBadge";

export const Route = createFileRoute("/para-mercados")({
  head: () => ({
    meta: [
      { title: "Para mercados — ViPreço" },
      {
        name: "description",
        content:
          "Como o seu mercado aparece no ViPreço para quem está comparando preço na região, sem precisar de integração com o caixa.",
      },
      { property: "og:title", content: "Para mercados — ViPreço" },
      {
        property: "og:description",
        content: "Apareça para quem está comparando preço na sua região, sem integração com PDV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForMarketsPage,
});

const BENEFITS = [
  {
    icon: Store,
    title: "Apareça para quem já decidiu comprar",
    text: "Quem busca um produto no ViPreço já está comparando preço para decidir onde comprar — seu mercado entra nessa comparação com o preço e a data que você mandar.",
  },
  {
    icon: Clock,
    title: "Poucos minutos por semana",
    text: "Sem formulário, sem cadastro complicado: você manda a oferta por WhatsApp e a equipe cuida do resto.",
  },
  {
    icon: ShieldCheck,
    title: "Sem integração com o caixa",
    text: "Nesta fase de teste não é preciso conectar nenhum sistema do mercado — nenhum PDV, nenhuma senha, nenhum acesso ao seu sistema.",
  },
];

const EXAMPLE_OFFER = {
  productName: "Café torrado e moído, tradicional 500 g",
  marketName: "Mercado Bairro Verde",
  neighborhood: "Artemis",
  price: "R$ 14,90",
  validUntil: "válido até 03/08",
};

function ExampleShareCard() {
  return (
    <div className="card-base bg-card p-4">
      <p className="eyebrow">Exemplo de card — não é uma oferta real</p>
      <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
        {EXAMPLE_OFFER.productName}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{EXAMPLE_OFFER.marketName}</p>
          <p className="meta-text">
            {EXAMPLE_OFFER.neighborhood} · {EXAMPLE_OFFER.validUntil}
          </p>
        </div>
        <p className="font-data shrink-0 text-2xl font-bold tabular-nums text-primary">
          {EXAMPLE_OFFER.price}
        </p>
      </div>
      <div className="mt-2">
        <SourceBadge source="store_list" />
      </div>
    </div>
  );
}

const REPORT_ROWS = [
  { label: "Ofertas publicadas na semana", value: "3" },
  { label: "Vezes que seu mercado apareceu numa comparação", value: "48 (exemplo)" },
  { label: "Vezes em que seu mercado tinha o menor preço", value: "21 (exemplo)" },
];

function ForMarketsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl">Para mercados</h1>
          <p className="meta-text mt-1 max-w-2xl text-sm">
            Uma forma simples do seu mercado aparecer para quem está comparando preço na região —
            sem integração com o caixa e sem burocracia.
          </p>
        </div>

        <AlertBanner tone="neutro">
          Participação inicial por convite, enquanto testamos o formato com um pequeno grupo de
          mercados.
        </AlertBanner>

        <ol className="grid gap-3 sm:grid-cols-3">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <li key={benefit.title} className="card-base">
                <Icon aria-hidden="true" className="size-5 text-primary" />
                <p className="mt-1.5 text-base font-bold">{benefit.title}</p>
                <p className="meta-text mt-0.5">{benefit.text}</p>
              </li>
            );
          })}
        </ol>

        <section aria-labelledby="card-titulo" className="space-y-2">
          <h2 id="card-titulo" className="font-display text-lg">
            Como sua oferta aparece para o consumidor
          </h2>
          <p className="meta-text max-w-2xl">
            Preço, mercado, bairro, data e origem sempre juntos — a mesma comparação que qualquer
            outro mercado da região, sem destaque pago que troque a ordem.
          </p>
          <div className="max-w-sm">
            <ExampleShareCard />
          </div>
        </section>

        <section aria-labelledby="fluxo-titulo" className="space-y-2">
          <h2 id="fluxo-titulo" className="font-display text-lg">
            Como funciona no dia a dia
          </h2>
          <ul className="space-y-2">
            <li className="card-compact flex items-start gap-2.5">
              <MessageCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="meta-text">
                Você manda uma foto ou mensagem no WhatsApp com o produto, o preço e até quando vale
                — do jeito que já faria para avisar um cliente.
              </p>
            </li>
            <li className="card-compact flex items-start gap-2.5">
              <UserCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="meta-text">
                A equipe confere a informação e publica no comparador — nesta fase de teste, a
                participação é sempre acompanhada por uma pessoa, não é uma publicação automática.
              </p>
            </li>
            <li className="card-compact flex items-start gap-2.5">
              <Pencil aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="meta-text">
                Preço errado ou fora da validade? É só avisar pelo mesmo canal — a equipe corrige
                diretamente, sem formulário.
              </p>
            </li>
          </ul>
        </section>

        <section aria-labelledby="relatorio-titulo" className="space-y-2">
          <h2 id="relatorio-titulo" className="font-display text-lg">
            Exemplo de relatório semanal
          </h2>
          <p className="meta-text max-w-2xl">
            Toda semana, um resumo simples de como seu mercado apareceu nas comparações — números
            ilustrativos abaixo, não são um resultado prometido.
          </p>
          <div className="card-base max-w-sm overflow-hidden p-0">
            <dl className="divide-y divide-border">
              {REPORT_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <dt className="meta-text">{row.label}</dt>
                  <dd className="font-data text-sm font-bold tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="faq-titulo"
          className="card-compact space-y-2 bg-surface text-sm text-surface-foreground"
        >
          <h2 id="faq-titulo" className="text-base font-bold">
            O que este teste não é
          </h2>
          <ul className="meta-text list-inside list-disc space-y-1">
            <li>Não é uma integração com o sistema de caixa do mercado.</li>
            <li>Não é uma promessa de aumento de venda ou de resultado específico.</li>
            <li>
              Não é uma posição paga: nenhuma comparação de preço muda de ordem por pagamento.
            </li>
            <li>Não substitui uma conversa direta — a equipe acompanha cada mercado nesta fase.</li>
          </ul>
        </section>

        <Link to="/como-funciona" className="btn-base btn-secondary w-full sm:w-auto">
          Entender como funciona a comparação
        </Link>
      </div>
    </AppShell>
  );
}
