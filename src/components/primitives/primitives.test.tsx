import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
} from "./index";

/**
 * R3.1 — as primitivas, RENDERIZADAS.
 *
 * A diferença entre este arquivo e os testes estáticos do repositório é deliberada: um
 * teste que procura `aria-label` no código-fonte prova que alguém escreveu `aria-label`.
 * Um teste que renderiza prova que o atributo chega ao HTML — que é a única coisa que o
 * leitor de tela vê. Para acessibilidade, só a segunda prova serve.
 *
 * `renderToStaticMarkup` roda em `environment: "node"` sem DOM e sem dependência nova.
 */
const html = (no: React.ReactElement) => renderToStaticMarkup(no);

describe("Button — o alvo de toque deixa de ser algo para lembrar", () => {
  it("nasce com 48 px, sem o chamador pedir", () => {
    expect(html(<Button>Rótulo</Button>)).toContain("btn-touch-48");
  });

  it("é `type=button` por padrão", () => {
    // Um botão dentro de `<form>` que submete sem ninguém pedir é o defeito mais
    // silencioso que um botão pode ter.
    expect(html(<Button>Rótulo</Button>)).toContain('type="button"');
  });

  it("mas ainda aceita submit quando é isso que se quer", () => {
    expect(html(<Button type="submit">Enviar</Button>)).toContain('type="submit"');
  });

  it.each(["primario", "secundario", "discreto"] as const)("a variante %s renderiza", (v) => {
    const saida = html(<Button variante={v}>Rótulo</Button>);
    expect(saida).toContain("btn-base");
    expect(saida).toContain("Rótulo");
  });

  it("a variante discreta traz a borda visível junto", () => {
    // `btn-quiet` sozinha tem borda transparente. Foi assim que o botão de compartilhar
    // ficou sem contorno no staging — e é por isso que as duas andam sempre em par.
    const saida = html(<Button variante="discreto">Rótulo</Button>);
    expect(saida).toContain("btn-quiet");
    expect(saida).toContain("btn-quiet-bordered");
  });

  it("desabilitado chega ao HTML como `disabled`, e não só como cor", () => {
    // WCAG 2.2 SC 1.4.1: cor não pode ser o único sinal. Um botão apagado que continua
    // clicável é pior do que um botão que parece ativo.
    expect(html(<Button disabled>Rótulo</Button>)).toContain("disabled");
  });
});

describe("IconButton — um botão sem nome é um botão que ninguém consegue usar", () => {
  const exemplo = (
    <IconButton rotulo="Fechar o aviso">
      <svg viewBox="0 0 24 24" />
    </IconButton>
  );

  it("o rótulo vira `aria-label` no HTML", () => {
    expect(html(exemplo)).toContain('aria-label="Fechar o aviso"');
  });

  it("o ícone é escondido do leitor de tela, para não ler a mesma coisa duas vezes", () => {
    expect(html(exemplo)).toContain('aria-hidden="true"');
  });

  it("mantém 48 px nos dois eixos", () => {
    const saida = html(exemplo);
    expect(saida).toContain("btn-touch-48");
    expect(saida).toContain("min-w-12");
  });
});

describe("Badge — cor mais texto, nunca cor sozinha", () => {
  it.each(["neutro", "positivo", "atencao", "critico", "informativo"] as const)(
    "o tom %s renderiza com o texto junto",
    (tom) => {
      const saida = html(<Badge tom={tom}>Rótulo do selo</Badge>);
      expect(saida).toContain("Rótulo do selo");
    },
  );

  it("nenhum tom usa o amarelo de marca", () => {
    // Princípio 4: amarelo abundante vira alarme, e alarme falso é o começo da
    // desconfiança. `atencao` usa a família âmbar de `--vp-warning`, não `--vp-yellow`.
    const fonte = readFileSync(join(process.cwd(), "src/components/primitives/badge.tsx"), "utf-8");
    const executavel = fonte.split("const TOM")[1] ?? "";
    expect(executavel.split("}")[0]).not.toContain("vp-yellow");
  });
});

describe("Surface, Divider e Skeleton", () => {
  it("a superfície tem três elevações, e só três", () => {
    for (const e of ["plana", "card", "destaque"] as const) {
      expect(html(<Surface elevacao={e}>Conteúdo</Surface>)).toContain("Conteúdo");
    }
  });

  it("o divisor é decorativo — não vira ruído no leitor de tela", () => {
    expect(html(<Divider />)).toContain('role="presentation"');
  });

  it("o esqueleto é escondido, porque quem anuncia o carregamento é a região", () => {
    // Um `aria-live` por retângulo cinza leria "carregando" cinco vezes.
    expect(html(<Skeleton />)).toContain('aria-hidden="true"');
  });

  it("o esqueleto aceita a dimensão do conteúdo que vai substituir", () => {
    // Esqueleto de tamanho genérico faz a página saltar quando o dado chega — que é
    // exatamente o incômodo que ele existia para evitar.
    expect(html(<Skeleton className="h-9 w-1/2" />)).toContain("h-9 w-1/2");
  });
});

describe("Stack, Inline e Container", () => {
  it("o Stack empilha e aplica o degrau da escala", () => {
    const saida = html(
      <Stack gap={6}>
        <span>a</span>
      </Stack>,
    );
    expect(saida).toContain("flex flex-col");
    expect(saida).toContain("gap-6");
  });

  it("o Inline quebra linha por padrão", () => {
    // A partir de 320 px, uma linha que não quebra é uma linha que produz scroll
    // horizontal na página inteira.
    expect(html(<Inline>{[<span key="a">a</span>]}</Inline>)).toContain("flex-wrap");
  });

  it("e quando não quebra, ao menos permite encolher", () => {
    // Sem `min-w-0`, um filho de texto longo estoura o flex container em vez de truncar.
    expect(html(<Inline quebrar={false}>{[<span key="a">a</span>]}</Inline>)).toContain("min-w-0");
  });

  it("o Container reaproveita a largura máxima que já existe", () => {
    // Duas larguras máximas para o mesmo produto é o tipo de divergência que só aparece
    // quando alguém compara duas telas lado a lado.
    expect(html(<Container>x</Container>)).toContain("page-container");
  });

  it("o VisuallyHidden fica no HTML — some da tela, não da árvore", () => {
    const saida = html(<VisuallyHidden>Carregando</VisuallyHidden>);
    expect(saida).toContain("sr-only");
    expect(saida).toContain("Carregando");
  });
});

describe("ImagePlaceholder — o estado padrão, não o de exceção", () => {
  it("é decorativo: sem `alt`, e escondido do leitor de tela", () => {
    // A identidade do produto está escrita ao lado, em texto. Um `alt` dizendo "imagem de
    // arroz" repetiria o que já foi lido e sugeriria que existe uma imagem daquele item.
    const saida = html(<ImagePlaceholder categoria="Mercearia" />);
    expect(saida).toContain('aria-hidden="true"');
    expect(saida).not.toContain("alt=");
  });

  it("cada categoria conhecida tem silhueta própria", () => {
    const mercearia = html(<ImagePlaceholder categoria="Mercearia" />);
    const limpeza = html(<ImagePlaceholder categoria="Limpeza" />);
    expect(mercearia).not.toBe(limpeza);
  });

  it("categoria desconhecida cai numa silhueta genérica em vez de quebrar", () => {
    // O placeholder existe justamente para o caso em que não se sabe o que mostrar.
    // Estourar aqui inverteria o propósito dele.
    expect(() => html(<ImagePlaceholder categoria="Categoria que não existe" />)).not.toThrow();
    expect(() => html(<ImagePlaceholder />)).not.toThrow();
  });

  it("não referencia nenhuma marca nem produto real", () => {
    const fonte = readFileSync(
      join(process.cwd(), "src/components/primitives/image-placeholder.tsx"),
      "utf-8",
    );
    for (const marca of ["Camil", "Pilão", "Italac", "Liza", "Ypê", "Neve"]) {
      expect(fonte).not.toContain(marca);
    }
  });
});

describe("nenhuma primitiva conhece dado", () => {
  it("nada em `primitives/` importa serviço, fixture ou cliente de banco", () => {
    // Uma primitiva que soubesse o que é um preço já não seria primitiva — e a fundação
    // visual passaria a depender do dado para poder ser revisada.
    const arquivos = [
      "layout.tsx",
      "surface.tsx",
      "button.tsx",
      "badge.tsx",
      "image-placeholder.tsx",
    ];
    for (const arquivo of arquivos) {
      const fonte = readFileSync(
        join(process.cwd(), "src/components/primitives", arquivo),
        "utf-8",
      );
      for (const proibido of [
        "@/services",
        "@/integrations",
        "demo-opportunities",
        "supabase",
        "useQuery",
      ]) {
        expect(fonte, `${arquivo} importa ${proibido}`).not.toContain(proibido);
      }
    }
  });
});

/**
 * R3.1A — o estado desabilitado passa a consumir `--vp-action-disabled`.
 *
 * O token existia desde o Brand System v2 e nenhum componente o lia: todo botão herdava
 * `opacity: 0.6` de `btn-base`. Um token de cor que ninguém consome não é um token, é uma
 * linha de CSS morta — e pior, dá a impressão de que a decisão de cor foi tomada quando
 * na prática o que decide é a opacidade, que depende do que estiver atrás.
 */
describe("Button desabilitado — o token deixa de ser decorativo", () => {
  const STYLES = readFileSync(new URL("../../styles.css", import.meta.url), "utf-8");

  it("a primitiva escreve a utilitária do estado desabilitado", () => {
    expect(html(<Button disabled>Indisponível</Button>)).toContain("btn-r31-disabled");
  });

  it("o IconButton também, senão o estado depende de qual primitiva o chamador escolheu", () => {
    expect(html(<IconButton rotulo="Fechar" disabled />)).toContain("btn-r31-disabled");
  });

  it("a utilitária consome --vp-action-disabled", () => {
    const bloco = STYLES.match(/@utility btn-r31-disabled \{[\s\S]*?\n\}/)?.[0];
    expect(bloco).toBeDefined();
    expect(bloco).toContain("var(--vp-action-disabled)");
  });

  it("desfaz a opacidade herdada, senão a cor do token chegaria desbotada", () => {
    const bloco = STYLES.match(/@utility btn-r31-disabled \{[\s\S]*?\n\}/)?.[0];
    expect(bloco).toContain("opacity: 1");
  });

  it("o :disabled de btn-base continua intocado — mexer nele mudaria a Home", () => {
    const base = STYLES.match(/@utility btn-base \{[\s\S]*?\n\}/)?.[0];
    expect(base).toContain("opacity: 0.6");
    expect(base).not.toContain("--vp-action-disabled");
  });

  it("o botão desabilitado sai com o atributo nativo, e não só com a aparência", () => {
    // Sem `disabled` de verdade, o clique por teclado continua chegando ao handler: o
    // botão pareceria inerte e não seria.
    const saida = html(<Button disabled>Indisponível</Button>);
    expect(saida).toContain("disabled");
  });

  it("nenhum componente fora das primitivas usa a utilitária nova", () => {
    // A Home não pode herdar este estado por acidente: §0 do mandato a mantém intocada.
    const consumidores = execSync("grep -rl 'btn-r31-disabled' src/ || true", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => f.replace(/\/{2,}/g, "/"))
      .filter((f) => !f.endsWith(".test.tsx"));
    expect(consumidores.sort()).toEqual(["src/components/primitives/button.tsx", "src/styles.css"]);
  });
});
