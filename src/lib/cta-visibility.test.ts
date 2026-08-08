import { describe, expect, it, vi } from "vitest";
import { createStickyCtaStore, hiddenCtaAttributes, marketCtaStore } from "@/lib/cta-visibility";

describe("quem está no comando do CTA", () => {
  it("começa com o CTA do fluxo no comando", () => {
    expect(createStickyCtaStore().get()).toBe(false);
  });

  it("no servidor a resposta é sempre a mesma — não há tela para medir", () => {
    const loja = createStickyCtaStore();
    loja.set(true);
    expect(loja.getOnServer()).toBe(false);
  });

  it("avisa quem está ouvindo quando o comando muda", () => {
    const loja = createStickyCtaStore();
    const ouvinte = vi.fn();
    loja.subscribe(ouvinte);

    loja.set(true);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(loja.get()).toBe(true);

    loja.set(false);
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it("não avisa ninguém quando a medida repete o valor anterior", () => {
    // A medida roda a cada evento de rolagem. Sem esta guarda, cada quadro de rolagem viraria
    // uma renderização do CTA da página.
    const loja = createStickyCtaStore();
    const ouvinte = vi.fn();
    loja.subscribe(ouvinte);

    loja.set(true);
    loja.set(true);
    loja.set(true);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("cancelar a inscrição para de avisar", () => {
    const loja = createStickyCtaStore();
    const ouvinte = vi.fn();
    const cancelar = loja.subscribe(ouvinte);
    cancelar();

    loja.set(true);
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it("os métodos funcionam soltos, como `useSyncExternalStore` os recebe", () => {
    // Os componentes passam `loja.subscribe` e `loja.get` como referências, sem o objeto. Se a
    // implementação passasse a depender de `this`, isso quebraria só em runtime.
    const { set, subscribe, get } = createStickyCtaStore();
    const ouvinte = vi.fn();
    subscribe(ouvinte);
    set(true);
    expect(get()).toBe(true);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });
});

describe("cada rota tem a sua loja", () => {
  it("a loja de uma rota não silencia a de outra", () => {
    // Até R3.3A eram duas lojas de produção — a do morador e a do dono de mercado — e este
    // teste as comparava. O CTA fixo saiu da Home, e a do morador saiu junto. A propriedade que
    // importa não é "existem duas": é que **instâncias não compartilham estado**, e é ela que a
    // próxima rota com CTA fixo vai herdar. Por isso a prova passou a ser contra uma instância
    // nova, e não contra uma constante que só existiria para o teste ter o que comparar.
    const outraRota = createStickyCtaStore();
    expect(outraRota).not.toBe(marketCtaStore);

    outraRota.set(true);
    expect(marketCtaStore.get()).toBe(false);
    outraRota.set(false);

    marketCtaStore.set(true);
    expect(outraRota.get()).toBe(false);
    marketCtaStore.set(false);
  });

  it("uma loja nova nunca nasce com a medição de outra", () => {
    const primeira = createStickyCtaStore();
    primeira.set(true);
    expect(createStickyCtaStore().get()).toBe(false);
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
