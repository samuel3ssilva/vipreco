import { createFileRoute, notFound } from "@tanstack/react-router";
import { Badge, Container, Divider, Stack, Surface } from "@/components/primitives";
import { ProductCardV2, ProductCardV2Skeleton } from "@/components/card-v2";
import { AGORA_DEMO, OFERTA_PRECO_GRANDE, VARIANTES } from "@/components/card-v2/fixtures";
import type { VarianteDoLaboratorio } from "@/components/card-v2/fixtures";
import { isVisualLabEnabled } from "@/lib/visual-lab";

/**
 * R3.2 — o laboratório do Card v2.
 *
 * =============================================================================
 * POR QUE UMA SEGUNDA ROTA, E NÃO UMA SEÇÃO NOVA EM `/laboratorio-visual`
 * =============================================================================
 *
 * Porque o contrato daquela rota proíbe exatamente o que esta precisa mostrar. Lá o teste
 * reprova nome de mercado, valor em reais que não seja `R$ 00,00`, menção a preço unitário
 * e a promoção — e reprova com razão: uma página de tokens que ganha um card de exemplo
 * com preço deixa de ser fundação e vira vazamento de conteúdo inventado.
 *
 * O comentário de cabeçalho da R3.1 já antecipava a saída: "se um dia alguém quiser ver
 * como fica com conteúdo, o lugar é a tela de verdade, com o fixture versionado — e aí é
 * R3.2, com contrato próprio e Gate próprio".
 *
 * Então esta rota tem contrato próprio (`laboratorio-card-v2.contract.test.ts`), com regras
 * DIFERENTES e não mais frouxas: aqui preço e mercado podem existir, e **só** podem existir
 * vindos do fixture fictício — nada remoto, nenhum nome de rede, nenhum logotipo, nenhum
 * GTIN. Mover o card para a rota antiga e afrouxar aquele teste seria contornar um guarda
 * em vez de escrever o segundo.
 *
 * O portão é o mesmo (`isVisualLabEnabled`), fechado por padrão, mais `noindex`. Página
 * interna não entra na navegação, não entra no `sitemap.xml` e não responde 200 em
 * produção.
 */
export const Route = createFileRoute("/laboratorio-card-v2")({
  beforeLoad: () => {
    if (!isVisualLabEnabled()) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Laboratório do Card v2 — ViPreço (interno)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LaboratorioCardV2,
});

function Bloco({
  titulo,
  proposito,
  children,
}: {
  titulo: string;
  proposito: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={3} as="section">
      <div>
        <h2 className="font-display text-lg leading-tight">{titulo}</h2>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
          {proposito}
        </p>
      </div>
      <div className="max-w-md">{children}</div>
    </Stack>
  );
}

function LaboratorioCardV2() {
  // Predicado de tipo, e não `!` depois do `.filter`. A asserção compilaria igual e
  // dependeria de eu ter lido o filtro certo; o predicado faz o compilador conferir.
  const comOferta = VARIANTES.filter(
    (v): v is VarianteDoLaboratorio & { oferta: NonNullable<VarianteDoLaboratorio["oferta"]> } =>
      v.oferta !== null,
  );

  return (
    <main className="bg-background text-foreground min-h-screen py-8">
      <Container>
        <Stack gap={8}>
          <Stack gap={3} as="header">
            <Badge tom="atencao">Página interna de desenvolvimento</Badge>
            <h1 className="font-display text-2xl">Laboratório do Card v2 — R3.2</h1>
            <p className="max-w-prose leading-relaxed">
              O Card v2 isolado, sem Home em volta. Todas as ofertas abaixo são{" "}
              <strong>fictícias e versionadas</strong>: “Mercado Exemplo”, “Bairro Exemplo”,
              “Produto Demonstrativo”. Nenhum dado vem de staging, de produção ou de qualquer
              chamada remota — esta página não faz nenhuma.
            </p>
            <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
              O instante de referência é fixo, para que a evidência não mude sozinha entre uma
              captura e outra. A densidade daqui é de laboratório e não define a densidade das telas
              do consumidor.
            </p>
          </Stack>

          <Divider />

          {/* `id` para o script de evidência recortar exatamente esta região. Sem ele o
              recorte dependeria de coordenada escrita à mão, que envelhece a cada linha
              de texto acrescentada acima. */}
          <Stack gap={8} className="scroll-mt-4" as="div" id="variantes">
            {VARIANTES.map((v) => (
              <Bloco key={v.chave} titulo={v.titulo} proposito={v.proposito}>
                {v.oferta === null ? (
                  <div aria-live="polite" aria-busy="true">
                    <span className="sr-only">Carregando oferta</span>
                    <ProductCardV2Skeleton />
                  </div>
                ) : (
                  <ProductCardV2
                    oferta={v.oferta}
                    now={AGORA_DEMO}
                    variant={v.destaque === true ? "destaque" : "secundario"}
                    avisoParcial={v.avisoParcial ?? null}
                  />
                )}
              </Bloco>
            ))}
          </Stack>

          <Divider />

          <Bloco
            titulo="Preço grande e nomes longos"
            proposito="Quatro dígitos, nome de mercado que quebra em duas linhas e variante extensa. O número não
              estoura a 320 px e a quantidade não trunca — é ela que separa dois produtos que de resto
              seriam o mesmo."
          >
            <ProductCardV2 oferta={OFERTA_PRECO_GRANDE} now={AGORA_DEMO} />
          </Bloco>

          <Divider />

          <Stack gap={3} as="section">
            <div>
              <h2 className="font-display text-lg leading-tight">Em lista</h2>
              <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
                Cards consecutivos, que é como eles vão de fato aparecer. É aqui que altura demais,
                excesso de selo e CTA dominante ficam evidentes — um card isolado quase sempre
                parece bem.
              </p>
            </div>
            <div id="em-lista" className="grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
              {comOferta.map((v) => (
                <ProductCardV2
                  key={`lista-${v.chave}`}
                  oferta={v.oferta}
                  now={AGORA_DEMO}
                  avisoParcial={v.avisoParcial ?? null}
                />
              ))}
            </div>
          </Stack>

          <Divider />

          <Surface padding="largo" elevacao="plana">
            <Stack gap={2}>
              <h2 className="font-display text-lg">O que este laboratório não decide</h2>
              <ul className="text-muted-foreground max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                <li>
                  a densidade das telas do consumidor — aqui os cards têm ar entre si para poderem
                  ser lidos um a um;
                </li>
                <li>
                  a ordem da lista orgânica: ela é por preço crescente, depois observação, depois
                  id, e vive em <code>comparison.ts</code>. Nada neste card influencia posição;
                </li>
                <li>
                  o que é produto exato e o que é similar — a separação é de{" "}
                  <code>equivalence.ts</code> e da tela de busca;
                </li>
                <li>
                  se uma imagem corresponde ao SKU. Quem decide é a revisão; o card só sabe desenhar
                  o que recebeu, e cai no placeholder quando não recebe.
                </li>
              </ul>
            </Stack>
          </Surface>
        </Stack>
      </Container>
    </main>
  );
}
