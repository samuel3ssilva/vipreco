import { describe, expect, it, vi } from "vitest";
import {
  DEMO_SHARE_PREFIX,
  SHARE_MESSAGE,
  buildShareText,
  shareAchado,
  whatsappShareUrl,
} from "@/lib/share";

const ACHADO = {
  produto: "Arroz Camil Tipo 1 5 kg",
  preco: 26.49,
  mercado: "Mercado local 3",
  validUntil: "2026-08-05T12:00:00.000Z",
  url: "https://exemplo.test/produto/abc",
  isDemo: true,
};

describe("texto compartilhado", () => {
  it("começa obrigatoriamente pelo aviso de exemplo fictício", () => {
    expect(buildShareText(ACHADO).startsWith(DEMO_SHARE_PREFIX)).toBe(true);
  });

  it("traz produto, preço, mercado, validade, URL e a assinatura", () => {
    const texto = buildShareText(ACHADO);
    expect(texto).toContain("Arroz Camil Tipo 1 5 kg");
    expect(texto).toContain("26,49");
    expect(texto).toContain("Mercado local 3");
    expect(texto).toContain("Artemis");
    expect(texto).toContain("Válido até 05/08/2026");
    expect(texto).toContain("https://exemplo.test/produto/abc");
    expect(texto).toContain("via ViPreço");
  });

  it("não inventa validade quando o mercado não informou", () => {
    const texto = buildShareText({ ...ACHADO, validUntil: null });
    expect(texto).not.toContain("Válido até");
  });

  it("fora do modo demonstração, não carrega o aviso de exemplo", () => {
    const texto = buildShareText({ ...ACHADO, isDemo: false });
    expect(texto).not.toContain(DEMO_SHARE_PREFIX);
    expect(texto).toContain("Arroz Camil Tipo 1 5 kg");
  });

  it("não carrega nenhum dado pessoal", () => {
    const texto = buildShareText(ACHADO);
    // Nenhum telefone, nenhum identificador: só o que está no card e a URL pública.
    expect(texto).not.toMatch(/\b\d{10,15}\b/);
    expect(texto).not.toContain("wa.me");
  });

  it("codifica o texto ao montar o endereço de compartilhamento do WhatsApp", () => {
    const url = whatsappShareUrl(buildShareText(ACHADO));
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(buildShareText(ACHADO));
    // Sem número: quem recebe é escolhido na hora, não é o destino operacional do CTA.
    expect(url).not.toMatch(/wa\.me\/\d/);
  });
});

describe("fluxo de compartilhamento", () => {
  it("usa a Web Share API quando ela existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const openWhatsapp = vi.fn();
    const resultado = await shareAchado(ACHADO, { share, openWhatsapp });
    expect(resultado).toBe("compartilhado");
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].text.startsWith(DEMO_SHARE_PREFIX)).toBe(true);
    expect(openWhatsapp).not.toHaveBeenCalled();
  });

  it("cai no WhatsApp quando não há Web Share API", async () => {
    const openWhatsapp = vi.fn();
    const resultado = await shareAchado(ACHADO, { openWhatsapp, copy: vi.fn() });
    expect(resultado).toBe("whatsapp-aberto");
    expect(openWhatsapp).toHaveBeenCalledTimes(1);
    expect(openWhatsapp.mock.calls[0][0]).toContain("wa.me/?text=");
  });

  it("cai em copiar o link quando não há nem Web Share nem WhatsApp", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    expect(await shareAchado(ACHADO, { copy })).toBe("link-copiado");
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it("fechar a folha de compartilhamento é cancelamento silencioso, não erro", async () => {
    const abort = new Error("cancelado");
    abort.name = "AbortError";
    const copy = vi.fn();
    const resultado = await shareAchado(ACHADO, {
      share: vi.fn().mockRejectedValue(abort),
      copy,
    });
    expect(resultado).toBe("cancelado");
    expect(SHARE_MESSAGE[resultado]).toBeNull();
    // Cancelar não dispara cópia de consolação.
    expect(copy).not.toHaveBeenCalled();
  });

  it("falha real vira erro, com o link copiado como alternativa", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    const resultado = await shareAchado(ACHADO, {
      share: vi.fn().mockRejectedValue(new Error("sem permissão")),
      copy,
    });
    expect(resultado).toBe("erro");
    expect(copy).toHaveBeenCalledTimes(1);
    expect(SHARE_MESSAGE.erro).toBe(
      "Não foi possível compartilhar. Link copiado como alternativa.",
    );
  });

  it("as mensagens de sucesso e de cópia são as aprovadas", () => {
    expect(SHARE_MESSAGE.compartilhado).toBe("Achado compartilhado");
    expect(SHARE_MESSAGE["whatsapp-aberto"]).toBe("WhatsApp aberto para compartilhar");
    expect(SHARE_MESSAGE["link-copiado"]).toBe("Link copiado");
  });
});

// Estes testes existem para impedir uma regressão *semântica*, não visual: a tentação natural, ao
// mexer no fluxo, é reunir os dois caminhos de sucesso numa mensagem só. Abrir o WhatsApp não é
// enviar; a página não fica sabendo o desfecho e não pode afirmar que ficou.
describe("o que cada mensagem afirma", () => {
  it("só a Web Share API resolvida afirma que o Achado foi compartilhado", async () => {
    const porWebShare = await shareAchado(ACHADO, { share: vi.fn().mockResolvedValue(undefined) });
    const porWhatsapp = await shareAchado(ACHADO, { openWhatsapp: vi.fn() });

    expect(SHARE_MESSAGE[porWebShare]).toBe("Achado compartilhado");
    expect(SHARE_MESSAGE[porWhatsapp]).not.toBe("Achado compartilhado");
  });

  it("o fallback do WhatsApp descreve a abertura, nunca o envio", async () => {
    const resultado = await shareAchado(ACHADO, { openWhatsapp: vi.fn() });
    const mensagem = SHARE_MESSAGE[resultado] ?? "";

    expect(mensagem).toBe("WhatsApp aberto para compartilhar");
    for (const afirmacao of ["compartilhado", "enviado", "enviamos", "sucesso"]) {
      expect(
        mensagem.toLowerCase(),
        `"${afirmacao}" afirma um envio que não aconteceu`,
      ).not.toContain(afirmacao);
    }
  });

  it("nenhum desfecho tem mensagem repetida — cada um diz uma coisa diferente", () => {
    const mensagens = Object.values(SHARE_MESSAGE).filter(
      (mensagem): mensagem is string => mensagem !== null,
    );
    expect(new Set(mensagens).size).toBe(mensagens.length);
  });

  it("só o cancelamento é silencioso", () => {
    for (const [desfecho, mensagem] of Object.entries(SHARE_MESSAGE)) {
      if (desfecho === "cancelado") expect(mensagem).toBeNull();
      else expect(mensagem, `"${desfecho}" precisa de mensagem`).toBeTruthy();
    }
  });
});
