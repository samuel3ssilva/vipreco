import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Container,
  Divider,
  IconButton,
  ImagePlaceholder,
  Inline,
  Skeleton,
  Stack,
  Surface,
  VisuallyHidden,
} from "@/components/primitives";
import { PARES_DE_CONTRASTE, contraste, resolverValor, tokensDoGrupo } from "@/design/tokens";
import type { GrupoDeToken, Token } from "@/design/tokens";
import { isVisualLabEnabled } from "@/lib/visual-lab";

/**
 * R3.1 — o laboratório visual.
 *
 * =============================================================================
 * O QUE ELE É, E O QUE ELE NÃO PODE SER
 * =============================================================================
 *
 * É uma página de desenvolvimento que mostra a fundação visual **sem produto em volta**:
 * paleta, escala tipográfica, espaço, raio, sombra, e cada primitiva em cada estado —
 * inclusive foco, desabilitado, carregando e placeholder.
 *
 * NÃO É uma tela do MVP e não pode virar uma. Nenhum dado real, nenhum mercado, nenhum
 * preço, nenhuma promoção, nenhum bairro. Nem inventado: o contrato visual (§1) separa
 * "referência de design" de "conteúdo inventado que vaza para dentro do produto", e um
 * laboratório com um card de exemplo trazendo nome de mercado e valor em reais é
 * exatamente esse vazamento, só que com a desculpa de ser um exemplo.
 *
 * A regra vale para o arquivo INTEIRO, comentário incluído — e o teste de contrato pegou
 * este parágrafo na primeira execução, quando ele ilustrava o problema escrevendo um nome
 * de mercado e um preço. Estava certo em pegar: o que hoje é exemplo dentro de um
 * comentário é o que amanhã alguém copia para dentro do JSX.
 *
 * Por isso todo texto aqui é abstrato: "Rótulo", "Ação primária", "Selo". Se um dia
 * alguém quiser ver como fica com conteúdo, o lugar é a tela de verdade, com o fixture
 * versionado — e aí é R3.2, com contrato próprio e Gate próprio.
 *
 * `laboratorio-visual.test.ts` reprova se nome de mercado, preço em reais ou bairro
 * aparecerem neste arquivo.
 */
export const Route = createFileRoute("/laboratorio-visual")({
  // O portão decide se a rota EXISTE. Sem ele, `noindex` seria só um pedido a
  // buscadores, e a página continuaria respondendo 200 para quem digitasse a URL.
  beforeLoad: () => {
    if (!isVisualLabEnabled()) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Laboratório visual — ViPreço (interno)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LaboratorioVisual,
});

// ---------------------------------------------------------------------------------
// Blocos do laboratório
// ---------------------------------------------------------------------------------

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Stack gap={4} as="section">
      <h2 className="font-display text-xl">{titulo}</h2>
      {children}
    </Stack>
  );
}

/** Uma amostra de cor com o nome do token e o valor resolvido — legíveis, não decorativos. */
function Amostra({ token }: { token: Token }) {
  const valor = resolverValor(token.nome) ?? token.valor;
  return (
    <Surface padding="compacto" elevacao="plana" className="min-w-0">
      <Stack gap={2}>
        <div
          className="border-border h-12 w-full rounded-md border"
          style={{ backgroundColor: `var(${token.nome})` }}
        />
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{token.nome}</p>
          <p className="meta-text truncate">{valor}</p>
          {token.nota ? <p className="meta-text mt-1">{token.nota}</p> : null}
        </div>
      </Stack>
    </Surface>
  );
}

function GradeDeCores({ grupo, titulo }: { grupo: GrupoDeToken; titulo: string }) {
  return (
    <Stack gap={3}>
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tokensDoGrupo(grupo).map((t) => (
          <Amostra key={t.nome} token={t} />
        ))}
      </div>
    </Stack>
  );
}

function Tipografia() {
  const tamanhos = tokensDoGrupo("tipografia-tamanho");
  return (
    <Stack gap={3}>
      {tamanhos.map((t) => (
        <Surface key={t.nome} padding="compacto" elevacao="plana">
          <Stack gap={1}>
            <p className="meta-text font-mono">
              {t.nome} — {t.valor}
            </p>
            <p
              // `font-bold` junto com `font-data` porque é assim que o preço aparece no
              // produto — `PriceCard` e `PriceSummary` escrevem os dois. Sem o peso, esta
              // amostra herdava 400 e o laboratório mostrava um preço que a comparação
              // nunca desenha.
              //
              // E a diferença não era só teórica: a face 400 da IBM Plex Mono não é
              // carregada (o conjunto importado é 500/600), então o 400 caía na 500 e o
              // 700 cai na 600. Medido por impressão digital de canvas — 400 e 500 pintam
              // pixels idênticos. Um laboratório de fundação visual que mostra o preço no
              // peso errado erra justamente no elemento que o produto existe para exibir.
              className={t.nome.includes("price") ? "font-data font-bold" : undefined}
              style={{ fontSize: `var(${t.nome})`, lineHeight: 1.2 }}
            >
              {t.nome.includes("price") ? "R$ 00,00" : "Reconhecer antes de comparar"}
            </p>
          </Stack>
        </Surface>
      ))}
    </Stack>
  );
}

function Escalas() {
  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Espaço</h3>
        {tokensDoGrupo("espaco").map((t) => (
          <Inline key={t.nome} gap={3} alinhar="centro">
            <span className="meta-text w-24 shrink-0 font-mono">{t.nome}</span>
            <span
              className="bg-primary h-3 rounded-sm"
              style={{ width: `var(${t.nome})` }}
              aria-hidden="true"
            />
            <span className="meta-text">{t.valor}</span>
          </Inline>
        ))}
      </Stack>

      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Raio</h3>
        <Inline gap={3}>
          {tokensDoGrupo("raio").map((t) => (
            <Stack key={t.nome} gap={1} alinhar="centro">
              <span
                className="bg-secondary border-border h-16 w-16 border"
                style={{ borderRadius: `var(${t.nome})` }}
                aria-hidden="true"
              />
              <span className="meta-text font-mono">{t.valor}</span>
            </Stack>
          ))}
        </Inline>
      </Stack>

      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Sombra</h3>
        <Inline gap={4}>
          {(["plana", "card", "destaque"] as const).map((e) => (
            <Surface key={e} elevacao={e} padding="normal" className="w-32">
              <p className="meta-text text-center">{e}</p>
            </Surface>
          ))}
        </Inline>
      </Stack>
    </Stack>
  );
}

function Primitivas() {
  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Botões</h3>
        <Inline gap={3}>
          <Button variante="primario">Ação primária</Button>
          <Button variante="secundario">Ação secundária</Button>
          <Button variante="discreto">Ação discreta</Button>
        </Inline>
        <Inline gap={3}>
          <Button variante="primario" disabled>
            Desabilitado
          </Button>
          <Button variante="secundario" disabled>
            Desabilitado
          </Button>
          <IconButton rotulo="Exemplo de ação com ícone">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              focusable="false"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </IconButton>
        </Inline>
        <p className="meta-text">
          Todo controle acima tem 48 px de altura mínima. O foco é o anel do sistema, e aparece com
          teclado — experimente <kbd>Tab</kbd>.
        </p>
      </Stack>

      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Selos</h3>
        <Inline gap={2}>
          <Badge tom="neutro">Neutro</Badge>
          <Badge tom="positivo">Positivo</Badge>
          <Badge tom="atencao">Atenção</Badge>
          <Badge tom="critico">Crítico</Badge>
          <Badge tom="informativo">Informativo</Badge>
        </Inline>
        <p className="meta-text">
          Cada selo é cor <strong>mais</strong> texto. Nenhum comunica só pela cor.
        </p>
      </Stack>

      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Superfícies vazias</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Surface elevacao="plana" padding="largo">
            <p className="meta-text">Superfície plana</p>
          </Surface>
          <Surface elevacao="card" padding="largo">
            <p className="meta-text">Superfície de card</p>
          </Surface>
          <Surface elevacao="destaque" padding="largo">
            <p className="meta-text">Superfície em destaque</p>
          </Surface>
        </div>
        <Divider />
        <p className="meta-text">Acima, um divisor.</p>
      </Stack>

      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Carregamento</h3>
        <Surface padding="normal">
          <Stack gap={2} aria-live="polite" aria-busy="true">
            <VisuallyHidden>Carregando</VisuallyHidden>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </Stack>
        </Surface>
      </Stack>

      <Stack gap={2}>
        <h3 className="text-sm font-semibold">Placeholder de imagem</h3>
        <p className="meta-text">
          Imagem errada é pior que ausência de imagem. Sem correspondência exata de variante e
          gramatura, o produto mostra isto — e o placeholder é decorativo, porque a identidade está
          escrita em texto ao lado.
        </p>
        <Inline gap={3}>
          {["Mercearia", "Laticínios", "Limpeza", "Higiene", "Bebidas", "Hortifruti"].map((c) => (
            <Stack key={c} gap={1} alinhar="centro">
              <ImagePlaceholder categoria={c} className="h-20 w-20" />
              <span className="meta-text">{c}</span>
            </Stack>
          ))}
          <Stack gap={1} alinhar="centro">
            <ImagePlaceholder className="h-20 w-20" />
            <span className="meta-text">sem categoria</span>
          </Stack>
        </Inline>
      </Stack>
    </Stack>
  );
}

function Contraste() {
  return (
    <Stack gap={2}>
      <p className="meta-text">
        Medido pela fórmula do WCAG 2.x sobre os valores reais dos tokens, não estimado.
        `src/design/tokens.test.ts` reprova o build quando algum par cai abaixo do mínimo.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="py-2 pr-3 font-semibold">Onde</th>
              <th className="py-2 pr-3 font-semibold">Medido</th>
              <th className="py-2 font-semibold">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {PARES_DE_CONTRASTE.map((par) => {
              const razao = contraste(
                resolverValor(par.frente) ?? "",
                resolverValor(par.fundo) ?? "",
              );
              return (
                <tr
                  key={`${par.frente}-${par.fundo}-${par.minimo}`}
                  className="border-border border-b"
                >
                  <td className="py-2 pr-3">{par.onde}</td>
                  <td className="py-2 pr-3 font-mono">
                    {razao === null ? "—" : `${razao.toFixed(2)}:1`}
                  </td>
                  <td className="py-2 font-mono">{par.minimo.toFixed(1)}:1</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}

// ---------------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------------

function LaboratorioVisual() {
  return (
    <main className="bg-background text-foreground min-h-screen py-8">
      <Container>
        <Stack gap={8}>
          <Stack gap={3} as="header">
            <Badge tom="atencao">Página interna de desenvolvimento</Badge>
            <h1 className="font-display text-2xl">Laboratório visual — fundação R3.1</h1>
            <p className="max-w-prose">
              Tokens e primitivas isolados, sem produto em volta. Nada aqui é dado: não há mercado,
              não há preço, não há oferta. Os textos são rótulos abstratos de propósito — um exemplo
              com conteúdo inventado vira, mais cedo do que se imagina, um conteúdo tratado como
              real.
            </p>
          </Stack>

          <Divider />

          <Secao titulo="1. Paleta">
            <Stack gap={5}>
              <GradeDeCores grupo="cor-base" titulo="Base" />
              <GradeDeCores grupo="cor-superficie" titulo="Superfície e borda" />
              <GradeDeCores grupo="cor-texto" titulo="Texto" />
              <GradeDeCores grupo="cor-acao" titulo="Ação e foco" />
              <GradeDeCores grupo="cor-estado" titulo="Estado" />
              <GradeDeCores grupo="cor-tempo" titulo="Tempo" />
            </Stack>
          </Secao>

          <Divider />
          <Secao titulo="2. Tipografia">
            <Tipografia />
          </Secao>

          <Divider />
          <Secao titulo="3. Escalas">
            <Escalas />
          </Secao>

          <Divider />
          <Secao titulo="4. Primitivas">
            <Primitivas />
          </Secao>

          <Divider />
          <Secao titulo="5. Contraste">
            <Contraste />
          </Secao>
        </Stack>
      </Container>
    </main>
  );
}
