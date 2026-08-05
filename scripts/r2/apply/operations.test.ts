import { describe, expect, it } from "vitest";
import {
  OPERACOES,
  OPERACOES_VALIDAS,
  SEQUENCIA_DE_ESCRITA,
  VERSOES_DO_BASELINE,
  ehOperacao,
  fraseConfere,
  podeExecutar,
  proximaOperacao,
  type EstadoMedido,
  type Operacao,
} from "./operations";

const ESTADO_INICIAL: EstadoMedido = { historicoRemoto: 0, gtinsInvalidos: 2 };

describe("catálogo de operações", () => {
  it("tem exatamente as nove operações do mandato, e nenhuma a mais", () => {
    expect(OPERACOES_VALIDAS.sort()).toEqual(
      [
        "adopt-seven-baseline",
        "apply-contribution-hardening",
        "apply-core-hardening",
        "apply-normalization",
        "apply-r2a",
        "apply-r2b",
        "plan",
        "remediate-demo-gtins",
        "validate",
      ].sort(),
    );
  });

  it("não existe operação que aplique tudo de uma vez", () => {
    // A ausência é o desenho. Uma operação assim transformaria nove checkpoints em um, e o
    // valor inteiro deste workflow está nos checkpoints.
    for (const nome of OPERACOES_VALIDAS) {
      expect(nome).not.toMatch(/all/i);
    }
  });

  it("recusa nome de operação desconhecido", () => {
    expect(ehOperacao("apply-everything")).toBe(false);
    expect(ehOperacao("PLAN")).toBe(false);
    expect(ehOperacao("plan")).toBe(true);
  });

  it("toda operação de escrita exige frase, e toda read-only não exige", () => {
    for (const [nome, def] of Object.entries(OPERACOES)) {
      expect(def.frase === null, `${nome}`).toBe(!def.escreve);
    }
  });

  it("as frases são todas distintas — nenhuma frase universal", () => {
    const frases = Object.values(OPERACOES)
      .map((d) => d.frase)
      .filter((f): f is string => f !== null);
    expect(new Set(frases).size).toBe(frases.length);
    expect(frases.length).toBe(7);
  });

  it("toda frase nomeia o ambiente, para não poder ser reaproveitada em produção", () => {
    for (const def of Object.values(OPERACOES)) {
      if (def.frase !== null) expect(def.frase).toContain("VIPRECO STAGING");
    }
  });

  it("o baseline tem sete versões, todas anteriores à normalização", () => {
    expect(VERSOES_DO_BASELINE).toHaveLength(7);
    for (const versao of VERSOES_DO_BASELINE) {
      expect(Number(versao)).toBeLessThan(20260803000000);
    }
  });

  it("a sequência de escrita cobre todas as operações que escrevem, e só elas", () => {
    const escrevem = OPERACOES_VALIDAS.filter((n) => OPERACOES[n].escreve).sort();
    expect([...SEQUENCIA_DE_ESCRITA].sort()).toEqual(escrevem);
  });

  it("cada passo da sequência começa onde o anterior termina", () => {
    let historico = 0;
    for (const operacao of SEQUENCIA_DE_ESCRITA) {
      const def = OPERACOES[operacao];
      expect(def.historicoAntes, `${operacao} espera outro estado inicial`).toBe(historico);
      historico = def.historicoDepois!;
    }
    expect(historico).toBe(12);
  });
});

describe("frase de confirmação", () => {
  it("aceita a frase exata", () => {
    expect(fraseConfere("apply-r2a", "APPLY R2A TO VIPRECO STAGING")).toBe(true);
  });

  it("recusa a frase de OUTRA operação", () => {
    // Este é o caso que a frase existe para pegar: a pessoa disparou a operação errada e
    // colou a frase que tinha à mão.
    expect(fraseConfere("apply-r2a", "APPLY R2B TO VIPRECO STAGING")).toBe(false);
  });

  it("recusa caixa diferente, espaço nas pontas e frase vazia", () => {
    expect(fraseConfere("apply-r2b", "apply r2b to vipreco staging")).toBe(false);
    expect(fraseConfere("apply-r2b", " APPLY R2B TO VIPRECO STAGING ")).toBe(false);
    expect(fraseConfere("apply-r2b", "")).toBe(false);
  });

  it("operação read-only não exige frase", () => {
    expect(fraseConfere("plan", "")).toBe(true);
    expect(fraseConfere("validate", "")).toBe(true);
  });
});

describe("máquina de estados", () => {
  it("do estado inicial, só a adoção do baseline pode rodar", () => {
    const podem = SEQUENCIA_DE_ESCRITA.filter((op) => podeExecutar(op, ESTADO_INICIAL).pode);
    expect(podem).toEqual(["adopt-seven-baseline"]);
    expect(proximaOperacao(ESTADO_INICIAL)).toBe("adopt-seven-baseline");
  });

  it("percorre a sequência inteira, um passo por vez", () => {
    let estado: EstadoMedido = { ...ESTADO_INICIAL };
    const percorridas: Operacao[] = [];

    for (let passo = 0; passo < SEQUENCIA_DE_ESCRITA.length; passo++) {
      const proxima = proximaOperacao(estado);
      expect(proxima, `travou no passo ${passo}`).not.toBeNull();
      percorridas.push(proxima!);
      estado = {
        historicoRemoto: OPERACOES[proxima!].historicoDepois!,
        gtinsInvalidos: proxima === "remediate-demo-gtins" ? 0 : estado.gtinsInvalidos,
      };
    }

    expect(percorridas).toEqual([...SEQUENCIA_DE_ESCRITA]);
    expect(proximaOperacao(estado)).toBeNull();
    expect(estado.historicoRemoto).toBe(12);
  });

  it("recusa pular um passo", () => {
    // Histórico em 7: a normalização é a próxima. Tentar o hardening central aqui é uma
    // operação perfeitamente válida contra um banco no estado errado.
    const veredito = podeExecutar("apply-core-hardening", {
      historicoRemoto: 7,
      gtinsInvalidos: 2,
    });
    expect(veredito.pode).toBe(false);
    expect(veredito.motivos[0]).toContain("não foi executada");
  });

  it("recusa repetir um passo já concluído", () => {
    const veredito = podeExecutar("adopt-seven-baseline", {
      historicoRemoto: 7,
      gtinsInvalidos: 2,
    });
    expect(veredito.pode).toBe(false);
    expect(veredito.motivos[0]).toContain("já foi executada");
  });

  it("recusa R2-A e R2-B enquanto houver GTIN inválido", () => {
    for (const operacao of ["apply-r2a", "apply-r2b"] as const) {
      const veredito = podeExecutar(operacao, {
        historicoRemoto: OPERACOES[operacao].historicoAntes!,
        gtinsInvalidos: 2,
      });
      expect(veredito.pode).toBe(false);
      expect(veredito.motivos.some((m) => m.includes("constraint"))).toBe(true);
    }
  });

  it("recusa a remediação quando não há exatamente dois GTINs inválidos", () => {
    // Três é achado novo, e achado novo é decisão do Founder/PMO. Zero significa que a
    // operação já rodou — e rodar de novo abriria uma transação para não fazer nada.
    for (const quantidade of [0, 1, 3]) {
      const veredito = podeExecutar("remediate-demo-gtins", {
        historicoRemoto: 10,
        gtinsInvalidos: quantidade,
      });
      expect(veredito.pode, `${quantidade} GTIN(s)`).toBe(false);
    }
    expect(
      podeExecutar("remediate-demo-gtins", { historicoRemoto: 10, gtinsInvalidos: 2 }).pode,
    ).toBe(true);
  });

  it("operações read-only rodam em qualquer estado", () => {
    for (const estado of [
      { historicoRemoto: 0, gtinsInvalidos: 2 },
      { historicoRemoto: 12, gtinsInvalidos: 0 },
      { historicoRemoto: 5, gtinsInvalidos: 9 },
    ]) {
      expect(podeExecutar("plan", estado).pode).toBe(true);
      expect(podeExecutar("validate", estado).pode).toBe(true);
    }
  });
});
