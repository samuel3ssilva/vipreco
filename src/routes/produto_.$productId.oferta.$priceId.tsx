import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Clock, MapPin, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MarketAvatar } from "@/components/MarketAvatar";
import { PesoSelector } from "@/components/PesoSelector";
import { ProductImage } from "@/components/card-v2/identity";
import { StateMessage } from "@/components/StateMessage";
import { ShareAchadoButton } from "@/components/ShareAchadoButton";
import { WhatsAppGlyph } from "@/components/WhatsAppCta";
import { DemoNote } from "@/components/DemoNote";
import { isDemoMode } from "@/lib/app-mode";
import { ofertaDemo } from "@/services/demo-source";
import { montarVisaoDoCard, precoParaCompartilhar } from "@/lib/card-v2";
import { PESO_PADRAO, rotuloDoPeso, type PesoSelecionado } from "@/lib/peso-variavel";
import { absoluteAssetUrl } from "@/lib/og";
import { formatDate, formatPrice, formatProductDetails, formatProductName } from "@/lib/format";

/**
 * =============================================================================
 * TELA 4 DO NORTH STAR — DETALHE DA OFERTA (mandato v2 §14)
 * =============================================================================
 *
 * A hierarquia continua a mesma, na ordem exata do DOM:
 *
 *   PRODUTO → PREÇO → MERCADO → CONDIÇÃO → AÇÃO → PROCEDÊNCIA
 *
 * O que o mandato v2 mudou é o PREÇO: o número muito grande é o que o consumidor paga —
 * o preço da embalagem, ou, no peso variável, o preço calculado para a quantidade
 * escolhida no seletor ("aprox. 500 g") — e o normalizado (R$/kg, R$/L, R$/un) fica logo
 * abaixo, menor, como base de comparação. A hierarquia nunca se inverte (§25).
 *
 * O preço de clube, quando existe, aparece ao lado do cheio com a condição colada — nunca
 * no lugar dele (§8). "Preço anterior riscado" continua fora: P-01 nunca foi decidida.
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

/**
 * A localidade do mercado, sem repetição e sem invenção (§16).
 *
 * Bairro conhecido vira "bairro · Piracicaba — SP" — a não ser que o bairro JÁ seja a
 * localidade (Artemis), caso em que ele é dito uma vez. Mercado sem bairro validado não
 * ganha linha nenhuma: rede de encarte regional não tem "onde" para afirmar, e nenhuma
 * distância é dita em nenhum caso.
 */
function localidade(bairro: string | null): string | null {
  if (bairro === null || bairro.trim().length === 0) return null;
  return bairro === "Artemis" ? "Artemis, Piracicaba — SP" : `${bairro} · Piracicaba — SP`;
}

function OfferPage() {
  const { productId, priceId } = Route.useParams();
  const oferta = ofertaDemo(productId, priceId);
  const [gramas, setGramas] = useState<PesoSelecionado>(PESO_PADRAO);
  const now = useMemo(() => new Date(), []);

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
  const granel = oferta.price_unit === "kg";
  const visao = montarVisaoDoCard(oferta, now, formatDate, {
    ...(granel ? { gramas } : {}),
    snapshotHistorico: isDemoMode(),
  });
  // V4.2 §5 — a linha de apoio só diz o que o título ainda não disse.
  const detalhes = formatProductDetails(product);
  const whatsapp = mensagemDeOferta(oferta.id, product.name);
  const onde = localidade(market.neighborhood);

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
              // V4.3 §1 — com pack obrigatório, o texto que viaja leva o desembolso
              // mínimo com o rótulo do pack, nunca o por-unidade solto.
              ...precoParaCompartilhar(oferta),
              ...(oferta.price_unit === undefined ? {} : { unidade: oferta.price_unit }),
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
            {detalhes.length > 0 ? (
              <p className="text-muted-foreground mt-1 text-sm">{detalhes}</p>
            ) : null}

            {/* V4 §4/§11 — no peso variável o número grande é o R$/kg observado, com a
                unidade colada; a simulação vem abaixo, menor. No embalado, o preço da
                embalagem com o normalizado abaixo, como sempre. */}
            {/* Escala por faixa: a coluna divide a largura com a imagem `ficha`, e com o
                sufixo "/kg" o teto de cada faixa mudou — 2rem é o que cabe a 320 px
                ("R$ 39,90/kg", pior caso), medido pelo QA de larguras. */}
            <p
              aria-hidden="true"
              className="font-display text-primary mt-3 text-[2rem] leading-none font-extrabold tabular-nums min-[360px]:text-[2.25rem] min-[390px]:text-[2.5rem] min-[430px]:text-[2.75rem]"
            >
              <span className="text-[60%] font-bold">R$</span>
              <span className="ml-1">{visao.preco.numero}</span>
              {visao.preco.quantidade !== null ? (
                <span className="text-muted-foreground ml-0.5 text-[45%] font-bold">
                  {visao.preco.quantidade}
                </span>
              ) : null}
            </p>
            {/* V4.3 §1 — o pack a que o desembolso se refere, e o por-unidade anunciado,
                secundário. O número grande é o que sai do bolso; o resto é informação. */}
            {visao.preco.embalagemMinima !== null ? (
              <p aria-hidden="true" className="text-muted-foreground mt-1 text-sm font-bold">
                {visao.preco.embalagemMinima}
              </p>
            ) : null}
            {visao.preco.porUnidade !== null ? (
              <p aria-hidden="true" className="text-muted-foreground mt-1 text-sm tabular-nums">
                {visao.preco.porUnidade}
              </p>
            ) : null}
            {visao.simulacao !== null ? (
              <p
                aria-hidden="true"
                className="text-muted-foreground mt-1 text-sm font-semibold tabular-nums"
              >
                {visao.simulacao}
              </p>
            ) : null}
            {visao.unitario !== null ? (
              <p aria-hidden="true" className="text-muted-foreground mt-0.5 text-sm tabular-nums">
                {formatPrice(visao.unitario.display)} {visao.unitario.rotulo}
              </p>
            ) : null}
            <span className="sr-only">{visao.preco.falado}</span>

            {visao.clube !== null ? (
              <p className="bg-secondary text-secondary-foreground mt-2 w-fit max-w-full rounded-md px-2 py-1 text-sm">
                <span className="font-bold tabular-nums">R$ {visao.clube.precoTexto}</span>{" "}
                {visao.clube.condicao}
              </p>
            ) : null}

            <p className="text-muted-foreground mt-1.5 text-xs">
              {granel
                ? "Preço por kg observado neste mercado, nesta data."
                : "Preço observado neste mercado, nesta data."}
            </p>
          </div>
        </div>

        {granel ? (
          <div className="space-y-1.5">
            {/* V4 §4 — o seletor é SIMULAÇÃO de quantidade, nomeada, nunca embalagem. */}
            <p className="eyebrow">Simulação de quantidade</p>
            <PesoSelector gramas={gramas} onChange={setGramas} />
            <p className="text-muted-foreground text-xs">
              Estimativa para {rotuloDoPeso(gramas)}. O valor final depende do peso.
            </p>
          </div>
        ) : null}

        {/* 3. MERCADO */}
        <section
          aria-label="Mercado"
          className="border-border bg-card shadow-card rounded-xl border p-4"
        >
          {/* V3: o avatar do mercado no lugar do ícone genérico de loja — a ficha é a tela
              em que a pessoa decide, e reconhecer O mercado vale mais que saber que é UM. */}
          <div className="flex items-center gap-3">
            <MarketAvatar market={market} />
            <div className="min-w-0">
              <p className="text-base font-bold">{market.name}</p>
              {onde !== null ? (
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  {onde}
                </p>
              ) : null}
            </div>
          </div>

          {/* 4. CONDIÇÃO — só a frase, curta e inequívoca (V4.2 §4). O prefixo "Condição
              desta oferta." dobrava a hierarquia sem acrescentar nada: a caixa de atenção
              já diz que isto é uma condição. */}
          {oferta.special_condition ? (
            <p className="bg-caution/25 text-caution-foreground mt-3 rounded-lg px-3 py-2.5 text-sm font-semibold">
              {oferta.special_condition}
            </p>
          ) : null}
        </section>

        {/* 5. AÇÃO — §14: comparar é o núcleo do produto e vem primeiro, sólido; o WhatsApp
            é o contato contextual, depois, contornado. A ficha tinha os dois invertidos. */}
        <div className="space-y-2">
          <Link
            to="/produto/$productId"
            params={{ productId }}
            className="btn-base btn-primary btn-touch-48 w-full"
          >
            Comparar preços
          </Link>
          {whatsapp ? (
            <a href={whatsapp} className="btn-base btn-secondary btn-touch-48 w-full">
              <WhatsAppGlyph />
              Receber achados no WhatsApp
            </a>
          ) : (
            <Link to="/whatsapp" className="btn-base btn-secondary btn-touch-48 w-full">
              <WhatsAppGlyph />
              Receber achados no WhatsApp
            </Link>
          )}
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
            {/* O selo de fonte É a linha — repetir o mesmo rótulo num badge logo abaixo
                era a mesma string duas vezes dentro de uma caixa de quatro linhas (§14). */}
            <Linha
              icone={<Store aria-hidden="true" className="size-3.5 shrink-0" />}
              rotulo="Fonte"
            >
              {visao.procedencia.origem}
            </Linha>
            <Linha
              icone={<Clock aria-hidden="true" className="size-3.5 shrink-0" />}
              rotulo="Atualizado em"
            >
              {visao.procedencia.observadoEm} · {visao.procedencia.relativo}
            </Linha>
            <Linha
              icone={<CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />}
              rotulo="Validade"
            >
              {visao.procedencia.validoAte !== null
                ? `${visao.procedencia.validadePassada ? "valeu até" : "até"} ${visao.procedencia.validoAte}`
                : "não informada"}
            </Linha>
          </dl>
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
 * quebrado — vira a rota `/whatsapp`, que explica o convite. É a mesma regra de falha
 * fechada de `WhatsAppCta`, com um destino a mais porque aqui existe um.
 */
function mensagemDeOferta(_priceId: string, _produto: string): string | null {
  // Deliberadamente sem `wa.me` direto: o número do piloto não está configurado, e montar o
  // link com um destino vazio é o defeito que `consumerWhatsappLink` já evita devolvendo nulo.
  return null;
}
