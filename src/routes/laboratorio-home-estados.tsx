import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ProductCardV2, ProductCardV2Skeleton } from "@/components/card-v2";
import { VARIANTES } from "@/components/card-v2/fixtures";
import { HomeAchados } from "@/components/HomeAchados";
import { StateMessage } from "@/components/StateMessage";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";
import { SEM_OFERTAS_VIGENTES, VAZIO_REAL } from "@/lib/home-states";
import { isVisualLabEnabled } from "@/lib/visual-lab";
import type { AchadoEntry } from "@/components/AchadoCard";

/**
 * R3.3 — os estados da seção de Achados da Home.
 *
 * =============================================================================
 * POR QUE NÃO SERVE O LABORATÓRIO DO CARD V2
 * =============================================================================
 *
 * Aquele mostra os estados de **um card**. Este mostra os estados de **uma tela** — que é
 * outra coisa, e é a que o Gate de R3.3 precisa julgar. "Apenas uma oferta" e "vazio" nem
 * existem no nível do card: são decisões de composição da seção (mostrar ou não o subtítulo
 * "Outros Achados", trocar a lista por uma mensagem). E "carregamento" no nível da tela é a
 * pergunta de se o layout desloca quando o dado chega, não a de se o esqueleto tem a forma
 * certa.
 *
 * Por isso os painéis abaixo renderizam o **componente de verdade** (`HomeAchados`) sempre que
 * o estado pode ser expresso pelas props dele. Só dois não podem — carregamento e erro parcial,
 * que são estados do card dentro da seção — e esses montam a seção à mão, com o mesmo título e
 * a mesma moldura, para que a comparação continue justa.
 *
 * O portão é o mesmo das outras rotas internas (`isVisualLabEnabled`), fechado por padrão, mais
 * `noindex`. Não entra na navegação, não entra no `sitemap.xml`, responde 404 em staging e em
 * produção.
 *
 * A largura fixa de 390 px em cada painel não é enfeite: é o celular comum, e um estado que só
 * é legível a 1280 px não é o estado que a pessoa vai ver.
 */
export const Route = createFileRoute("/laboratorio-home-estados")({
  beforeLoad: () => {
    if (!isVisualLabEnabled()) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Laboratório — estados da Home (interno)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LaboratorioHomeEstados,
});

/**
 * Instante fixo da captura. Sem ele, "ontem" e "há 2 dias" mudariam de texto conforme a hora em
 * que o screenshot roda, e duas capturas do mesmo commit sairiam diferentes — que é exatamente
 * o defeito que o congelamento de animação corrigiu do outro lado.
 */
const AGORA = new Date("2026-08-06T15:00:00.000Z");

/**
 * O painel tinha uma faixa de "Divergência" — o lugar onde uma diferença conhecida entre o que a
 * tela mostra e o que o produto deveria mostrar ficava escrita, em vez de ser omitida. Ela foi
 * usada uma vez, no painel 4, e R3.3A resolveu aquela divergência. Sem nenhuma para declarar, a
 * faixa saiu: um mecanismo que nunca dispara não avisa ninguém de nada.
 */
function Painel({
  numero,
  titulo,
  proposito,
  children,
}: {
  numero: string;
  titulo: string;
  proposito: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-[390px] shrink-0 flex-col gap-3">
      <header>
        <h2 className="font-display text-base leading-tight">
          {numero}. {titulo}
        </h2>
        <p className="meta-text mt-1 leading-relaxed">{proposito}</p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-3">{children}</div>
    </section>
  );
}

/** A moldura da seção, para os dois estados que `HomeAchados` não expressa por props. */
function SecaoManual({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="achados-titulo-manual" className="space-y-4">
      <h2 id="achados-titulo-manual" className="font-display text-xl">
        Achados
      </h2>
      {children}
    </section>
  );
}

const SELO = (
  <p
    className="font-data inline-flex items-center gap-2 rounded-md border border-dashed bg-surface px-3 py-1.5 text-xs text-muted-foreground"
    style={{ borderColor: "var(--vp-border-strong)" }}
  >
    <span aria-hidden="true">◌</span>
    dados fictícios · exemplos para demonstrar o formato
  </p>
);

/**
 * As duas telas sem Achados vêm de `@/lib/home-states`, as MESMAS que a Home renderiza. Copy
 * duplicada aqui produziria uma evidência que mostra um produto que não existe — que é o defeito
 * mais caro que uma tela de Gate pode ter.
 */
const VAZIO = (
  <StateMessage
    variant="empty"
    title={VAZIO_REAL.title}
    description={VAZIO_REAL.description}
    action={null}
  />
);

const VENCIDAS = (
  <StateMessage
    variant="empty"
    title={SEM_OFERTAS_VIGENTES.title}
    description={SEM_OFERTAS_VIGENTES.description}
    action={
      <Link to="/buscar" className="btn-base btn-secondary btn-sm btn-touch-48">
        {SEM_OFERTAS_VIGENTES.acao}
      </Link>
    }
  />
);

function LaboratorioHomeEstados() {
  const tres = buildDemoOpportunities(AGORA);
  const [primeiro] = tres;

  // Um Achado cuja validade já passou. `isValidPrice` o excluiria na Home; aqui ele é mostrado
  // de propósito, porque o estado a julgar é "como o card se apresenta quando o dado envelheceu".
  const desatualizado: AchadoEntry = {
    ...primeiro,
    id: "estado-desatualizado",
    observed_at: new Date(AGORA.getTime() - 9 * 86_400_000).toISOString(),
    valid_until: new Date(AGORA.getTime() - 2 * 86_400_000).toISOString(),
  };

  // O PAR, e não só o estado sozinho. "Sem imagem confiável" cai no placeholder — e placeholder
  // é o que TODO card sem imagem aprovada mostra. Isolado, o painel provaria nada: sairia igual
  // aos outros seis. A prova é a variante A ao lado, com correspondência aprovada, mostrando a
  // foto que a C recusa por a correspondência de variante ser apenas aproximada.
  const comImagem = VARIANTES.find((v) => v.chave === "A")?.oferta ?? null;
  const semImagem = VARIANTES.find((v) => v.chave === "C")?.oferta ?? null;
  const erroParcial = VARIANTES.find((v) => v.chave === "H");

  return (
    <main className="min-h-dvh bg-background p-6" data-laboratorio-estados="">
      <header className="mb-8 max-w-prose">
        <p className="eyebrow">R3.3 · evidência do Gate</p>
        <h1 className="font-display text-2xl leading-tight">Estados da seção de Achados</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sete estados, cada um a 390 px — a largura do celular comum. Instante de referência
          congelado em 06/08/2026, para que duas capturas do mesmo commit saiam idênticas.
        </p>
      </header>

      <div className="flex flex-wrap gap-x-8 gap-y-12">
        <Painel
          numero="1"
          titulo="Carregando"
          proposito="A geometria do esqueleto é a do card de destaque. Quando o dado chega, nada desloca — e o carregamento é anunciado uma vez pela região, não uma vez por retângulo."
        >
          <SecaoManual>
            <div aria-busy="true" aria-live="polite">
              <ProductCardV2Skeleton />
            </div>
          </SecaoManual>
        </Painel>

        <Painel
          numero="2"
          titulo="Vazio — nenhum Achado existe"
          proposito="Nada foi conferido ainda. A mensagem não inventa oferta, não promete prazo e devolve o usuário para a busca, que é o que continua funcionando."
        >
          <HomeAchados opportunities={[]} now={AGORA} fallback={VAZIO} seal={SELO} />
        </Painel>

        <Painel
          numero="3"
          titulo="Erro parcial"
          proposito="Um campo não pôde ser carregado e é nomeado. O produto continua identificável, o preço continua com procedência, e o que falta aparece como frase — não como buraco."
        >
          <SecaoManual>
            {erroParcial?.oferta ? (
              <ProductCardV2
                oferta={erroParcial.oferta}
                now={AGORA}
                variant="destaque"
                avisoParcial={erroParcial.avisoParcial}
              />
            ) : null}
          </SecaoManual>
        </Painel>

        <Painel
          numero="4"
          titulo="Sem ofertas vigentes"
          proposito="Achados existem na fonte, mas todos venceram: `isValidPrice` filtra os três e a seção fica sem nada para mostrar. R3.3A deu copy própria a este caso — antes ele caía na mensagem do painel 2, que afirma um começo que já aconteceu. Aqui existe uma saída concreta, e ela é oferecida."
        >
          <HomeAchados opportunities={[]} now={AGORA} fallback={VENCIDAS} seal={SELO} />
        </Painel>

        <Painel
          numero="5"
          titulo="Oferta desatualizada"
          proposito="A validade informada pelo mercado já passou. O rótulo de estado vem em texto, antes do preço, e sem urgência fabricada — nenhuma contagem regressiva, nenhuma cor sozinha carregando o significado."
        >
          <SecaoManual>
            <ProductCardV2 oferta={desatualizado} now={AGORA} variant="destaque" />
          </SecaoManual>
        </Painel>

        <Painel
          numero="6"
          titulo="Sem imagem confiável"
          proposito="O par, porque o estado sozinho não se distingue: placeholder é o que todo card sem imagem aprovada mostra. Em cima, correspondência exata aprovada. Embaixo, a mesma tela quando a correspondência é apenas aproximada — entra o placeholder, nunca a imagem parecida, que é o que faria o usuário comparar o produto errado."
        >
          <SecaoManual>
            <div className="space-y-3">
              <p className="meta-text">Correspondência aprovada — a imagem aparece:</p>
              {comImagem ? (
                <ProductCardV2 oferta={comImagem} now={AGORA} variant="destaque" />
              ) : null}
              <p className="meta-text pt-1">Correspondência apenas aproximada — placeholder:</p>
              {semImagem ? (
                <ProductCardV2 oferta={semImagem} now={AGORA} variant="destaque" />
              ) : null}
            </div>
          </SecaoManual>
        </Painel>

        <Painel
          numero="7"
          titulo="Apenas uma oferta"
          proposito="Um Achado só. O subtítulo “Outros Achados” não aparece — um cabeçalho de lista sem lista é ruído que promete conteúdo inexistente."
        >
          <HomeAchados opportunities={[primeiro]} now={AGORA} seal={SELO} />
        </Painel>
      </div>
    </main>
  );
}
