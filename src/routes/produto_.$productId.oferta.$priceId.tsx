import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Clock, MapPin, Store, Tag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductImage } from "@/components/card-v2/identity";
import { SourceBadge } from "@/components/SourceBadge";
import { StateMessage } from "@/components/StateMessage";
import { ShareAchadoButton } from "@/components/ShareAchadoButton";
import { WhatsAppGlyph } from "@/components/WhatsAppCta";
import { DemoNote } from "@/components/DemoNote";
import { isDemoMode } from "@/lib/app-mode";
import { ofertaDemo } from "@/services/demo-source";
import { sourceLabel } from "@/lib/sources";
import { absoluteAssetUrl } from "@/lib/og";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";

/**
 * =============================================================================
 * TELA 4 DO NORTH STAR — DETALHE DA OFERTA
 * =============================================================================
 *
 * Rota nova. Ela não existia: o produto ia da comparação direto para lugar nenhum, e cada linha
 * da lista era um destino sem página.
 *
 * A hierarquia é a do §5 do mandato, e o DOM segue ela na ordem exata:
 *
 *   PRODUTO → PREÇO → MERCADO → CONDIÇÃO → AÇÃO → PROCEDÊNCIA
 *
 * "Confiança da informação" fica por último de propósito. Ela precisa existir — é o que separa
 * o ViPreço de um print de grupo de WhatsApp —, e precisa ficar **abaixo da oferta**, porque
 * quem abriu esta tela abriu para ver um preço, não para ler sobre metodologia.
 *
 * =============================================================================
 * O QUE NÃO FOI COPIADO DA REFERÊNCIA, E POR QUÊ
 * =============================================================================
 *
 * **"Preço anterior: ~~R$ 20,49~~"**. O §5 do mandato é explícito ("não usar preço riscado sem
 * contrato legítimo"), e não existe: a decisão P-01 — qual observação anterior conta como
 * "antes" — nunca foi tomada. Um preço riscado é uma afirmação de que houve queda, e sem
 * critério escrito ela é uma afirmação sobre nada.
 *
 * **O logotipo do mercado**. Nenhum mercado autorizou nada, e os desta demonstração são
 * fictícios: um logotipo aqui seria inventar identidade visual de uma empresa que não existe,
 * ao lado de um preço que se apresenta como observado.
 *
 * =============================================================================
 * ESTA ROTA É DE DEMONSTRAÇÃO (§2 e §27)
 * =============================================================================
 *
 * `ofertaDemo` devolve `null` fora do modo demo, e a tela responde "oferta não encontrada".
 * Falha fechada: nada aqui promete que o piloto já tem endpoint de oferta individual.
 */
export const Route = createFileRoute("/produto_/$productId/oferta/$priceId")({
  component: OfferPage,
  head: () => ({
    meta: [
      { title: "Detalhe da oferta — ViPreço" },
      {
        name: "description",
        content:
          "Preço observado, mercado, fonte, data e validade de uma oferta específica em Artemis.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function OfferPage() {
  const { productId, priceId } = Route.useParams();
  const oferta = ofertaDemo(productId, priceId);

  if (oferta === null) {
    return (
      <AppShell>
        <StateMessage
          variant="empty"
          title="Oferta não encontrada."
          description="Ela pode ter vencido, ou o endereço está incompleto."
          action={
            <Link
              to="/produto/$productId"
              params={{ productId }}
              className="btn-base btn-secondary btn-touch-48"
            >
              Ver a comparação do produto
            </Link>
          }
        />
      </AppShell>
    );
  }

  const { product, market } = oferta;
  const detalhes = [product.variant, product.size_text].filter(Boolean).join(" · ");
  const whatsapp = mensagemDeOferta(oferta.id, product.name);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-2">
          <Link
            to="/produto/$productId"
            params={{ productId }}
            aria-label="Voltar para a comparação"
            className="btn-base btn-quiet size-12 shrink-0 rounded-full p-0"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
          <span className="flex-1" />
          <ShareAchadoButton
            payload={{
              produto: formatProductName(product),
              preco: oferta.price,
              mercado: market.name,
              validUntil: oferta.valid_until,
              url: absoluteAssetUrl(`/produto/${productId}/oferta/${priceId}`),
              isDemo: isDemoMode(),
            }}
          />
        </div>

        {/* 1. PRODUTO e 2. PREÇO — lado a lado, com a embalagem grande. */}
        <div className="flex items-start gap-4 sm:gap-5">
          <ProductImage
            imagem={oferta.image ?? null}
            categoria={product.category}
            tamanho="ficha"
            prioridade
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[1.5rem] leading-[1.15] font-extrabold sm:text-[1.75rem]">
              {formatProductName(product)}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{detalhes}</p>

            <p
              aria-hidden="true"
              className="font-display text-primary mt-3 text-[2.5rem] leading-none font-extrabold tabular-nums min-[430px]:text-[2.75rem]"
            >
              <span className="text-[60%] font-bold">R$</span>
              <span className="ml-1">{formatPrice(oferta.price).replace("R$", "").trim()}</span>
            </p>
            <span className="sr-only">Preço observado: {formatPrice(oferta.price)}</span>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Preço observado neste mercado, nesta data.
            </p>
          </div>
        </div>

        {/* 3. MERCADO */}
        <section
          aria-label="Mercado"
          className="border-border bg-card shadow-card rounded-xl border p-4"
        >
          <p className="flex items-center gap-2 text-base font-bold">
            <Store aria-hidden="true" className="text-primary size-4 shrink-0" />
            {market.name}
          </p>
          {market.neighborhood ? (
            <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              {market.neighborhood} · Artemis, Piracicaba — SP
            </p>
          ) : null}

          {/* 4. CONDIÇÃO */}
          {oferta.special_condition ? (
            <p className="bg-caution/25 text-caution-foreground mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
              <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">Condição desta oferta.</strong>{" "}
                {oferta.special_condition}
              </span>
            </p>
          ) : null}
        </section>

        {/* 5. AÇÃO */}
        <div className="space-y-2">
          {whatsapp ? (
            <a href={whatsapp} className="btn-base btn-primary btn-touch-48 w-full">
              <WhatsAppGlyph />
              Receber achados no WhatsApp
            </a>
          ) : (
            <Link to="/whatsapp" className="btn-base btn-primary btn-touch-48 w-full">
              <WhatsAppGlyph />
              Receber achados no WhatsApp
            </Link>
          )}
          <Link
            to="/produto/$productId"
            params={{ productId }}
            className="btn-base btn-secondary btn-touch-48 w-full"
          >
            Comparar com os outros mercados
          </Link>
        </div>

        {/* 6. PROCEDÊNCIA */}
        <section
          aria-labelledby="confianca-oferta"
          className="border-border bg-surface/60 rounded-xl border p-4"
        >
          <h2 id="confianca-oferta" className="font-display text-sm font-bold">
            Confiança da informação
          </h2>
          <dl className="mt-2.5 space-y-2 text-sm">
            <Linha
              icone={<Store aria-hidden="true" className="size-3.5 shrink-0" />}
              rotulo="Fonte"
            >
              {sourceLabel(oferta.source_type)}
            </Linha>
            <Linha
              icone={<Clock aria-hidden="true" className="size-3.5 shrink-0" />}
              rotulo="Atualizado em"
            >
              {formatDate(oferta.observed_at)} · {formatRelativeDay(oferta.observed_at)}
            </Linha>
            <Linha
              icone={<CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />}
              rotulo="Validade"
            >
              {oferta.valid_until ? `até ${formatDate(oferta.valid_until)}` : "não informada"}
            </Linha>
          </dl>
          <div className="mt-3">
            <SourceBadge source={oferta.source_type} />
          </div>
        </section>

        <DemoNote />
      </div>
    </AppShell>
  );
}

function Linha({
  icone,
  rotulo,
  children,
}: {
  icone: React.ReactNode;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-start gap-x-3">
      <dt className="text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
        {icone}
        {rotulo}
      </dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * O CTA de WhatsApp desta tela é **contextual**: sem número configurado ele não vira link
 * quebrado — vira a rota `/whatsapp`, que explica o convite. É a mesma regra de falha fechada
 * de `WhatsAppCta`, com um destino a mais porque aqui existe um.
 */
function mensagemDeOferta(_priceId: string, _produto: string): string | null {
  // Deliberadamente sem `wa.me` direto: o número do piloto não está configurado, e montar o
  // link com um destino vazio é o defeito que `consumerWhatsappLink` já evita devolvendo nulo.
  return null;
}
