import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HomeAchados } from "@/components/HomeAchados";
import { HomeContexto } from "@/components/HomeContexto";
import { TrustSection } from "@/components/TrustSection";
import { LocalStory } from "@/components/LocalStory";
import { Info } from "lucide-react";
import { ProductSearch } from "@/components/ProductSearch";
import { ShareAchadoButton } from "@/components/ShareAchadoButton";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { StateMessage } from "@/components/StateMessage";
import { loadHomeOpportunities } from "@/services/home-opportunities";
import { appMode } from "@/lib/app-mode";
import { DEMO_NATUREZA_DO_DADO, DEMO_PRODUCTS } from "@/lib/demo-catalog";
import { SHORTCUTS } from "@/lib/atalhos-de-busca";
import { estadoSemAchados } from "@/lib/home-states";
import { absoluteAssetUrl, ogImageMeta } from "@/lib/og";
import { formatProductName } from "@/lib/format";
import { isValidPrice } from "@/lib/comparison";
import { observadaNoSnapshot } from "@/lib/demo-catalog";

// Tudo o que a Home mostra de primeira — os Achados — chega pelo loader da rota (mesmo padrão de
// `/produto/$productId`), não por `useQuery` no cliente: o HTML inicial já vem completo, sem
// nenhum estado de carregamento e sem depender de JavaScript no navegador para aparecer.
export const Route = createFileRoute("/")({
  loader: async () => loadHomeOpportunities(appMode()),
  head: () => ({
    meta: [
      { title: "ViPreço — onde está mais barato hoje" },
      {
        name: "description",
        content:
          "Compare o mesmo produto entre os mercados da sua região e veja onde está mais barato, quando o preço foi observado e de onde veio a informação.",
      },
      { property: "og:title", content: "ViPreço — onde está mais barato hoje" },
      {
        property: "og:description",
        content:
          "Compare produtos iguais entre mercados da sua região com data e fonte de cada preço.",
      },
      { property: "og:type", content: "website" },
      ...ogImageMeta(),
    ],
  }),
  component: HomePage,
  errorComponent: () => (
    <AppShell>
      <StateMessage
        variant="error"
        title="Não conseguimos carregar as oportunidades."
        description="Verifique sua conexão e tente novamente."
        onRetry={() => window.location.reload()}
      />
    </AppShell>
  ),
});

/**
 * O aviso de confiança da primeira dobra.
 *
 * A frase é a mesma da North Star v1.2.2 e continua inteira. O que R3.3B mudou foi a moldura:
 * era um `AlertBanner` com fundo, borda e ícone de informação — o peso de um alerta, para uma
 * observação que não é alerta nenhum. Numa tela que abre com título, campo de busca e atalhos,
 * uma caixa colorida logo abaixo do campo rouba a atenção do que vem em seguida, que são os
 * Achados. Discreto foi o pedido do §6, e discreto é o que a frase merece.
 *
 * `PriceDisclaimer` continua exatamente como está em `/buscar` e em `/produto/$productId`: lá a
 * pessoa já está diante de preços para decidir, e a caixa é proporcional ao momento.
 */
function AvisoDePreco() {
  return (
    <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Os preços podem mudar.</strong> Confira a data e a fonte
        antes de comprar.
      </span>
    </p>
  );
}

/**
 * A ORDEM DA HOME MUDOU EM R3.3, E A MUDANÇA É A BUSCA SUBINDO.
 *
 * Antes: promessa → Achados → busca → seletor de mercado → confiança → história local. A busca
 * ficava depois de tudo o que o produto tinha para mostrar, e o usuário que chegava sabendo o
 * que queria precisava rolar por uma vitrine antes de poder perguntar.
 *
 * Agora: contexto → **busca** → Achados → WhatsApp → procedência → piloto. É a decisão D2 do
 * roadmap (MVP-E2-02, MVP-DESIGN-05), e ela reconhece o que o produto é: a comparação é o
 * núcleo, e a busca é a porta dela. Achados são descoberta — importam, e vêm logo abaixo, mas
 * não na frente de quem já sabe o que procura.
 *
 * =============================================================================
 * O QUE R3.3A TIROU DAQUI, E POR QUE
 * =============================================================================
 *
 * **O CTA fixo de WhatsApp.** Ele acompanhava a rolagem desde a primeira dobra, o que significa
 * que a Home pedia o contato da pessoa antes de ela ter consumido um único Achado. O convite
 * continua — uma vez só, inline, depois dos Achados —, e é isso que o torna secundário de
 * verdade: a descoberta e a comparação vêm primeiro, e o opt-in só é oferecido a quem já viu o
 * que o produto entrega.
 *
 * **O seletor de mercado habitual.** Personalização não é escopo do MVP, e um seletor na Home
 * declara o contrário. Ele NÃO foi apagado do produto: continua em `/produto/$productId`, na
 * variante compacta, onde a preferência tem consequência imediata — a linha de "quanto você
 * economiza" na comparação. Na Home ele era uma pergunta sem resposta visível. A ideia de
 * personalização por mercado está registrada em `ROADMAP-MVP-v3.md` §4 como POST-MVP.
 */
function HomePage() {
  const { source, opportunities, generatedAt } = Route.useLoaderData();
  // Referência única de tempo, vinda do servidor: mantém "ontem"/"há 2 dias" idêntico no HTML
  // inicial e depois da hidratação, mesmo se o relógio do aparelho estiver adiantado.
  const renderedAt = new Date(generatedAt);
  // Demo é SNAPSHOT (§18): o preço observado fica, com "valeu até" na procedência quando a
  // validade passou. O caminho do piloto continua no `isValidPrice` do princípio 2.
  const validOpportunities = opportunities.filter((entry) =>
    source === "demo" ? observadaNoSnapshot(entry, renderedAt) : isValidPrice(entry, renderedAt),
  );
  // O modo do ambiente decide; a origem do dado é uma trava a mais, para o caso de um dado
  // fictício aparecer num ambiente que se declara piloto.
  const isDemo =
    source === "demo" || validOpportunities.some((entry) => entry.is_demo || entry.market?.is_demo);
  const [destaque] = validOpportunities;
  // Quantos a FONTE entregou, antes do filtro de validade: é essa contagem que distingue
  // "nada foi conferido ainda" de "o que tinha venceu". Ver `@/lib/home-states`.
  const semAchados = estadoSemAchados(opportunities.length);

  return (
    <AppShell>
      {/* V4 §18 — space-y-5, não 7: a primeira dobra precisa entregar produto, preço,
          mercado e CTA (§3/§26), e cada 8 px de folga entre blocos empurra o preço para
          baixo. O respiro DENTRO dos blocos não mudou. */}
      <div className="space-y-5">
        <HomeContexto />

        {/* A BUSCA NA PRIMEIRA DOBRA. Sem `autoFocus`: abrir o teclado do celular por conta
            própria cobre metade da tela antes de a pessoa decidir o que quer fazer. */}
        <section aria-label="Busca de produto" className="space-y-2.5">
          <ProductSearch destaque label="Busque um produto exato" />
          {/* V4 §19 — os chips numa LINHA só, rolável: cinco categorias em duas linhas
              custavam ~56 px da primeira dobra. O quinto chip aparece cortado na borda,
              que é o próprio convite a rolar. `-mx-*` sangra a linha até a borda da
              página, como o benchmark de grocery faz com carrosséis. */}
          <ul className="sem-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut} className="shrink-0">
                <Link
                  to="/buscar"
                  search={{ q: shortcut }}
                  className="btn-base btn-secondary btn-touch-48 rounded-full px-4 text-sm font-semibold whitespace-nowrap"
                >
                  {shortcut}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <HomeAchados
          opportunities={validOpportunities}
          now={renderedAt}
          snapshotHistorico={source === "demo"}
          shareSlot={
            destaque ? (
              <ShareAchadoButton
                payload={{
                  produto: formatProductName(destaque.product),
                  preco: destaque.price,
                  ...(destaque.price_unit === undefined ? {} : { unidade: destaque.price_unit }),
                  mercado: destaque.market.name,
                  validUntil: destaque.valid_until,
                  url: absoluteAssetUrl(`/produto/${destaque.product.id}`),
                  isDemo,
                }}
              />
            ) : null
          }
          seal={
            isDemo ? (
              // R3.3B §7 tirou a moldura, não a frase, e 09/08/2026 trocou a frase porque ela
              // ficou falsa. Ela dizia "dados fictícios · exemplos para demonstrar o formato",
              // e estes cinco preços não são fictícios: foram lidos nas placas de um balcão.
              // O texto vem de `demo-catalog`, junto do dado que descreve.
              <p className="text-muted-foreground pt-1 text-xs">{DEMO_NATUREZA_DO_DADO}</p>
            ) : null
          }
          fallback={
            <StateMessage
              variant="empty"
              title={semAchados.title}
              description={semAchados.description}
              action={
                semAchados.acao ? (
                  <Link to="/buscar" className="btn-base btn-secondary btn-sm btn-touch-48">
                    {semAchados.acao}
                  </Link>
                ) : null
              }
            />
          }
        />

        {/* V3 §3/§6 — a vitrine é convite; a porta do catálogo inteiro fica logo abaixo
            dela, com a contagem real. É o que transforma "6 exemplos" em "um catálogo". */}
        {source === "demo" ? (
          <Link to="/buscar" className="btn-base btn-secondary btn-touch-48 w-full">
            Ver o catálogo completo — {DEMO_PRODUCTS.length} produtos comparados
          </Link>
        ) : null}

        <AvisoDePreco />

        {/* O WHATSAPP É SECUNDÁRIO, e a posição diz isso. Ele vem depois do que o produto
            entrega, não antes: pedir o contato de alguém que ainda não viu nada é pedir cedo
            demais. Nenhuma promessa de frequência — o texto do CTA não diz "todo dia". */}
        <WhatsAppCta />

        <TrustSection />

        <LocalStory />
      </div>
    </AppShell>
  );
}
