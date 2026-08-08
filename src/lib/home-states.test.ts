import { describe, expect, it } from "vitest";
import {
  SEM_OFERTAS_VIGENTES,
  VAZIO_REAL,
  estadoSemAchados,
  type EstadoSemAchados,
} from "@/lib/home-states";

/**
 * O teste que o mandato de R3.3A pede com todas as letras: "adicionar teste que impeça os dois
 * estados de reutilizarem a mesma mensagem".
 *
 * Ele não verifica que as copies são as que estão escritas hoje — isso seria só repetir o
 * arquivo. Verifica a **propriedade**: nenhum campo visível pode coincidir entre as duas telas.
 * Uma reescrita futura pode mudar as duas frases inteiras e este teste continua valendo; o que
 * ele não deixa passar é as duas voltarem a dizer a mesma coisa.
 */
describe("vazio real e sem ofertas vigentes são telas diferentes", () => {
  const campos = ["title", "description"] as const;

  it.each(campos)("o campo %s difere entre as duas", (campo) => {
    expect(VAZIO_REAL[campo]).not.toBe(SEM_OFERTAS_VIGENTES[campo]);
  });

  it("nenhum dos textos é vazio ou só espaço", () => {
    for (const estado of [VAZIO_REAL, SEM_OFERTAS_VIGENTES] as EstadoSemAchados[]) {
      for (const campo of campos) {
        expect(estado[campo].trim().length, `${estado.chave}.${campo}`).toBeGreaterThan(0);
      }
    }
  });

  it("as chaves são distintas — nada de dois estados com a mesma identidade", () => {
    expect(VAZIO_REAL.chave).not.toBe(SEM_OFERTAS_VIGENTES.chave);
  });

  it('"estamos começando" só aparece no vazio real', () => {
    // A frase específica que estava errada no estado de ofertas vencidas: ela afirma um começo
    // que já aconteceu. É a divergência que o painel de estados registrou em R3.3 e que R3.3A
    // fechou, e por isso ela tem um teste próprio, além da regra genérica acima.
    expect(VAZIO_REAL.title).toContain("começando a mapear");
    expect(SEM_OFERTAS_VIGENTES.title).not.toContain("começando");
    expect(SEM_OFERTAS_VIGENTES.description).not.toContain("começando");
  });

  it("só o estado de ofertas vencidas oferece uma saída — porque só nele existe uma", () => {
    // No vazio real não há o que buscar: nada foi cadastrado ainda, e um botão "Buscar produto"
    // levaria a uma segunda tela vazia. A descrição já devolve a pessoa para a busca em texto.
    expect(SEM_OFERTAS_VIGENTES.acao).toBe("Buscar produto");
    expect(VAZIO_REAL.acao).toBeUndefined();
  });
});

describe("qual tela mostrar, decidido por dado", () => {
  it("fonte vazia é vazio real", () => {
    expect(estadoSemAchados(0)).toBe(VAZIO_REAL);
  });

  it("fonte com itens e nenhum válido é oferta vencida", () => {
    for (const total of [1, 3, 50]) {
      expect(estadoSemAchados(total), `${total} na fonte`).toBe(SEM_OFERTAS_VIGENTES);
    }
  });

  it("a decisão não depende de nenhuma heurística de texto ou de horário", () => {
    // Duas chamadas iguais devolvem o mesmo objeto, sempre: a função é pura e a tela não pode
    // mudar entre o HTML do servidor e a hidratação no navegador.
    expect(estadoSemAchados(3)).toBe(estadoSemAchados(3));
    expect(estadoSemAchados(0)).toBe(estadoSemAchados(0));
  });
});
