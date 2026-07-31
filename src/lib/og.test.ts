import { statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OG_IMAGE_HEIGHT,
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
