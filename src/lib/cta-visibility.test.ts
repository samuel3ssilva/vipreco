import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStickyCtaVisible,
  getStickyCtaVisibleOnServer,
  hiddenCtaAttributes,
  setStickyCtaVisible,
  subscribeStickyCta,
} from "@/lib/cta-visibility";

beforeEach(() => {
  setStickyCtaVisible(false);
});

describe("quem está no comando do CTA", () => {
  it("começa com o CTA do fluxo no comando", () => {
    expect(getStickyCtaVisible()).toBe(false);
  });

  it("no servidor a resposta é sempre a mesma — não há tela para medir", () => {
    setStickyCtaVisible(true);
    expect(getStickyCtaVisibleOnServer()).toBe(false);
  });

  it("avisa quem está ouvindo quando o comando muda", () => {
    const ouvinte = vi.fn();
    subscribeStickyCta(ouvinte);

    setStickyCtaVisible(true);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(getStickyCtaVisible()).toBe(true);

    setStickyCtaVisible(false);
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it("não avisa ninguém quando a medida repete o valor anterior", () => {
    // A medida roda a cada evento de rolagem. Sem esta guarda, cada quadro de rolagem viraria
    // uma renderização do CTA da página.
    const ouvinte = vi.fn();
    subscribeStickyCta(ouvinte);

    setStickyCtaVisible(true);
    setStickyCtaVisible(true);
    setStickyCtaVisible(true);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("cancelar a inscrição para de avisar", () => {
    const ouvinte = vi.fn();
    const cancelar = subscribeStickyCta(ouvinte);
    cancelar();

    setStickyCtaVisible(true);
    expect(ouvinte).not.toHaveBeenCalled();
  });
});

describe("o CTA duplicado sai da ordem de foco e da árvore acessível", () => {
  it("com o CTA fixo no ar, o do fluxo fica inerte, escondido e fora da tabulação", () => {
    const { container, link } = hiddenCtaAttributes(true);
    expect(container.inert).toBe(true);
    expect(container["aria-hidden"]).toBe("true");
    expect(link.tabIndex).toBe(-1);
  });

  it("sem duplicação, nenhum atributo é aplicado — o CTA do fluxo é o normal da página", () => {
    const { container, link } = hiddenCtaAttributes(false);
    expect(container).toEqual({});
    expect(link).toEqual({});
    expect("aria-hidden" in container).toBe(false);
    expect("tabIndex" in link).toBe(false);
  });

  it("nunca marca `aria-hidden` sem tirar o elemento da tabulação", () => {
    // A regra da WAI-ARIA que este teste protege: um elemento focável não pode estar
    // `aria-hidden`. Vale nos dois sentidos, para qualquer entrada.
    for (const duplicado of [true, false]) {
      const { container, link } = hiddenCtaAttributes(duplicado);
      const escondido = container["aria-hidden"] === "true";
      expect(escondido, "aria-hidden exige tabIndex -1").toBe(link.tabIndex === -1);
      expect(escondido, "aria-hidden exige inert").toBe(container.inert === true);
    }
  });
});
