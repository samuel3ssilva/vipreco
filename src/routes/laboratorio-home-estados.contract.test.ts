import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVisualLab } from "@/lib/visual-lab";

/**
 * Contrato da rota interna de estados da Home.
 *
 * Mesmas duas obrigações das outras rotas de laboratório: **portão fechado por padrão** e
 * **`noindex`**. Uma página de desenvolvimento respondendo 200 num ambiente de entrevista não é
 * vazamento de dado; é ruído com aparência de erro, num produto cuja proposta é ser confiável.
 *
 * E uma obrigação a mais, própria desta: ela existe para produzir `home-achados-states.png`, e o
 * mandato lista **sete** estados nomeados. Se um sumir do código, o teste reprova antes de a
 * captura sair — em vez de a evidência sair silenciosamente com seis.
 */
const ROTA = readFileSync(
  join(process.cwd(), "src", "routes", "laboratorio-home-estados.tsx"),
  "utf-8",
);

const ESTADOS_EXIGIDOS = [
  "Carregando",
  "Vazio — nenhum Achado existe",
  "Erro parcial",
  "Sem ofertas vigentes",
  "Oferta desatualizada",
  "Sem imagem confiável",
  "Apenas uma oferta",
] as const;

describe("o portão", () => {
  it("é fechado por padrão — um build sem a variável não tem laboratório", () => {
    expect(resolveVisualLab(undefined, false)).toBe(false);
    expect(resolveVisualLab("", false)).toBe(false);
    expect(resolveVisualLab("0", false)).toBe(false);
  });

  it("a rota lança notFound quando o laboratório está desabilitado", () => {
    expect(ROTA).toMatch(/beforeLoad:.*\n?.*if \(!isVisualLabEnabled\(\)\) throw notFound\(\)/);
  });

  it("declara noindex, como toda rota interna", () => {
    expect(ROTA).toMatch(/name:\s*"robots",\s*content:\s*"noindex, nofollow"/);
  });
});

describe("os sete estados", () => {
  it.each(ESTADOS_EXIGIDOS)("o painel %s existe", (estado) => {
    expect(ROTA).toContain(estado);
  });

  it("são exatamente sete painéis, nem mais nem menos", () => {
    const paineis = ROTA.match(/<Painel\b/g) ?? [];
    expect(paineis).toHaveLength(ESTADOS_EXIGIDOS.length);
  });
});

describe("o que a rota não pode fazer", () => {
  it("não consulta nada — nenhum serviço, nenhum Supabase, nenhuma query", () => {
    expect(ROTA).not.toMatch(/@\/services\//);
    expect(ROTA).not.toMatch(/@\/integrations\/supabase/);
    expect(ROTA).not.toMatch(/useQuery|QueryClient/);
    expect(ROTA).not.toMatch(/\bloader\s*:/);
  });

  it("todo dado vem de fixture versionado e fictício", () => {
    expect(ROTA).toMatch(/from "@\/lib\/demo-opportunities"/);
    expect(ROTA).toMatch(/from "@\/components\/card-v2\/fixtures"/);
  });

  it("o instante de referência é fixo — senão a captura muda com o relógio", () => {
    expect(ROTA).toMatch(/const AGORA = new Date\("2026-08-06/);
    // Nenhum `new Date()` sem argumento: seria a variação que o congelamento existe para matar.
    expect(ROTA).not.toMatch(/new Date\(\)/);
  });

  it("não reintroduz histórico de preço (DL-030)", () => {
    expect(ROTA).not.toMatch(/previous_price|antes R\$|preço anterior/i);
  });

  it("não escreve copy própria: as telas sem Achados vêm de `@/lib/home-states`", () => {
    // A evidência do Gate mostra o que o produto mostra. Copy escrita à mão aqui produziria um
    // painel que envelhece em silêncio — e o Founder julgaria uma tela que não existe.
    expect(ROTA).toMatch(/from "@\/lib\/home-states"/);
    expect(ROTA).toContain("VAZIO_REAL.title");
    expect(ROTA).toContain("SEM_OFERTAS_VIGENTES.title");
    expect(ROTA).not.toContain("Estamos começando a mapear preços");
    expect(ROTA).not.toContain("Nenhuma oferta vigente no momento");
  });

  it("os painéis 2 e 4 não mostram mais a mesma mensagem (R3.3A, item 5)", () => {
    const vazio = ROTA.indexOf("Vazio — nenhum Achado existe");
    const vencidas = ROTA.indexOf("Sem ofertas vigentes");
    expect(vazio).toBeGreaterThan(-1);
    expect(vencidas).toBeGreaterThan(vazio);
    // Cada painel recebe o SEU fallback. Se voltarem a apontar para o mesmo, isto reprova.
    expect(ROTA).toContain("fallback={VAZIO}");
    expect(ROTA).toContain("fallback={VENCIDAS}");
    expect(ROTA.match(/fallback=\{VAZIO\}/g) ?? []).toHaveLength(1);
  });
});
