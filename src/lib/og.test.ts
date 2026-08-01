import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_MARKETS_ALT,
  OG_IMAGE_MARKETS_PATH,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  absoluteAssetUrl,
  ogImageMeta,
} from "@/lib/og";

function meta(property: string): string | undefined {
  return ogImageMeta().find((entry) => entry.property === property || entry.name === property)
    ?.content;
}

describe("metadados de prévia de link", () => {
  it("declara og:image com dimensões e twitter:card grande", () => {
    expect(meta("og:image")).toBe(OG_IMAGE_PATH);
    expect(meta("og:image:width")).toBe("1200");
    expect(meta("og:image:height")).toBe("630");
    expect(meta("og:image:type")).toBe("image/png");
    expect(meta("twitter:card")).toBe("summary_large_image");
  });

  it("descreve a imagem para quem não a vê", () => {
    expect(meta("og:image:alt")).toMatch(/fictício/i);
  });

  it("monta URL absoluta quando o ambiente informa a origem", () => {
    expect(absoluteAssetUrl("/og/x.png", "https://exemplo.workers.dev")).toBe(
      "https://exemplo.workers.dev/og/x.png",
    );
    expect(absoluteAssetUrl("/og/x.png", "https://exemplo.workers.dev/")).toBe(
      "https://exemplo.workers.dev/og/x.png",
    );
  });

  it("cai para o caminho relativo sem origem configurada, e nunca quebra com valor inválido", () => {
    expect(absoluteAssetUrl("/og/x.png", undefined)).toBe("/og/x.png");
    expect(absoluteAssetUrl("/og/x.png", "")).toBe("/og/x.png");
    expect(absoluteAssetUrl("/og/x.png", "não-é-url")).toBe("/og/x.png");
  });

  it("não fixa nenhum domínio no código", () => {
    expect(OG_IMAGE_PATH).toMatch(/^\//);
    expect(OG_IMAGE_PATH).not.toContain("http");
  });
});

describe("asset estático da prévia", () => {
  it("existe no bundle público e é leve o bastante para o rastreador buscar", () => {
    const png = statSync(join(process.cwd(), "public", OG_IMAGE_PATH));
    expect(png.isFile()).toBe(true);
    expect(png.size).toBeGreaterThan(1_000);
    expect(png.size).toBeLessThan(500_000);
  });

  it("é fase estática — nenhum gerador dinâmico por Achado", () => {
    expect(OG_IMAGE_PATH).not.toContain("$");
    expect(OG_IMAGE_WIDTH).toBe("1200");
    expect(OG_IMAGE_HEIGHT).toBe("630");
  });
});

describe("asset da proposta para mercados (Parte 3)", () => {
  function metaMercados(property: string): string | undefined {
    return ogImageMeta({ path: OG_IMAGE_MARKETS_PATH, alt: OG_IMAGE_MARKETS_ALT }).find(
      (entry) => entry.property === property || entry.name === property,
    )?.content;
  }

  it("é um asset próprio, não o do consumidor", () => {
    expect(OG_IMAGE_MARKETS_PATH).not.toBe(OG_IMAGE_PATH);
    expect(metaMercados("og:image")).toBe(OG_IMAGE_MARKETS_PATH);
    expect(metaMercados("og:image:alt")).toBe(OG_IMAGE_MARKETS_ALT);
    expect(metaMercados("twitter:card")).toBe("summary_large_image");
    expect(metaMercados("og:image:width")).toBe("1200");
    expect(metaMercados("og:image:height")).toBe("630");
    expect(metaMercados("og:image:type")).toBe("image/png");
  });

  it("não muda a prévia das outras rotas", () => {
    expect(meta("og:image")).toBe(OG_IMAGE_PATH);
    expect(meta("og:image:alt")).toMatch(/fictício/i);
  });

  it("existe no bundle público, em 1200×630, e é leve o bastante", () => {
    const png = statSync(join(process.cwd(), "public", OG_IMAGE_MARKETS_PATH));
    expect(png.isFile()).toBe(true);
    expect(png.size).toBeGreaterThan(1_000);
    expect(png.size).toBeLessThan(500_000);
    // O PNG carrega as dimensões no cabeçalho IHDR: bytes 16–23, big-endian.
    const cabecalho = readFileSync(join(process.cwd(), "public", OG_IMAGE_MARKETS_PATH));
    expect(cabecalho.readUInt32BE(16)).toBe(1200);
    expect(cabecalho.readUInt32BE(20)).toBe(630);
  });

  it("tem o fonte vetorial ao lado, sem número, métrica ou promessa", () => {
    const svg = readFileSync(
      join(process.cwd(), "public", OG_IMAGE_MARKETS_PATH.replace(/\.png$/, ".svg")),
      "utf-8",
    );
    expect(svg).toContain("Seu mercado mais perto");
    expect(svg).toContain("Piloto em preparação · Artemis");
    // Nenhum dígito solto no texto exibido: os únicos números do arquivo são coordenadas.
    for (const texto of svg.match(/>([^<>]+)</g) ?? []) {
      expect(texto, `texto com número: ${texto}`).not.toMatch(/\d/);
    }
    for (const proibido of ["R$", "cashback", "%", "vendas", "grátis", "vagas"]) {
      expect(svg.toLowerCase(), `a imagem não pode dizer "${proibido}"`).not.toContain(
        proibido.toLowerCase(),
      );
    }
  });

  it("é estático: nenhum gerador dinâmico, nenhuma dependência externa", () => {
    const svg = readFileSync(
      join(process.cwd(), "public", OG_IMAGE_MARKETS_PATH.replace(/\.png$/, ".svg")),
      "utf-8",
    );
    expect(OG_IMAGE_MARKETS_PATH).not.toContain("$");
    // O `xmlns` é o namespace do formato, não um recurso buscado — fora dele, nenhuma URL.
    expect(svg.replace(/xmlns="[^"]*"/g, "")).not.toMatch(/https?:\/\//);
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("<script");
  });
});
