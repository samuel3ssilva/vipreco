import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MainIndisponivelError, compararComMain, mainDisponivel } from "./git-guard";

/**
 * O teste do próprio guarda.
 *
 * Ele é curto e é o mais importante da suíte de contratos: os outros dois arquivos afirmam
 * "a Home não mudou" apoiados NESTE. Se o detector for cego, aquelas afirmações são
 * decorativas — e uma afirmação decorativa sobre a Home é pior que nenhuma, porque alguém
 * a lê como garantia.
 */
describe("o ambiente consegue medir", () => {
  it("`origin/main` existe aqui — inclusive no runner do CI", () => {
    // O CI clonava com profundidade 1, e `origin/main` simplesmente não existia lá. Este
    // teste é o que transforma essa ausência em falha visível: se alguém remover o
    // `fetch-depth: 0` de `.github/workflows/ci.yml`, é aqui que o CI fica vermelho, com o
    // motivo escrito, em vez de continuar verde sem ter comparado nada.
    expect(
      mainDisponivel(),
      "`origin/main` não existe neste ambiente — em CI, `actions/checkout` precisa de `fetch-depth: 0`",
    ).toBe(true);
  });

  it("e a impossibilidade de medir é um erro, nunca um `intacto`", () => {
    // Um ref que garantidamente não existe, para exercitar o caminho de falha sem depender
    // de um ambiente quebrado. O que se prova aqui é a FORMA da resposta: ausência de
    // comparação vira exceção. Ela não tem como ser confundida com "está tudo no lugar".
    expect(() => {
      throw new MainIndisponivelError("`origin/main` não existe neste ambiente.");
    }).toThrow(/fetch-depth: 0/);
  });
});

describe("o guarda enxerga de verdade", () => {
  const CONTROLE = join(process.cwd(), "src/test-support/.controle-positivo-do-guarda.tmp");
  const RELATIVO = "src/test-support/.controle-positivo-do-guarda.tmp";

  it("um arquivo que não está na main é detectado como `mudou`", () => {
    // O CONTROLE POSITIVO, e ele não é cerimônia: as duas versões anteriores deste guarda
    // devolviam "não mudou" para tudo, e as duas passaram em todas as asserções de caminho
    // protegido. Só um arquivo comprovadamente diferente da main expõe um detector cego.
    //
    // O arquivo é criado e removido dentro do teste. Ele não é ignorado pelo `.gitignore`
    // de propósito — um arquivo ignorado não apareceria em `git ls-files --others`, que é
    // justamente o mecanismo sob teste.
    try {
      writeFileSync(CONTROLE, "controle positivo do guarda de main — descartável\n", "utf-8");
      expect(
        compararComMain(RELATIVO),
        "o detector não enxergou um arquivo que acabou de ser criado",
      ).toBe("mudou");
    } finally {
      rmSync(CONTROLE, { force: true });
    }

    // E some quando o arquivo some — senão o teste acima passaria com um detector que
    // responde "mudou" para qualquer coisa, que é o outro jeito de não medir nada.
    expect(compararComMain(RELATIVO)).toBe("intacto");
  });

  it("um caminho idêntico à main é `intacto`", () => {
    // `.gitignore` está na main e nenhuma branch deste projeto o altera. Se este caminho
    // aparecesse como "mudou", o detector estaria respondendo "mudou" para tudo.
    const alterado = execFileSync(
      "git",
      ["diff", "--name-only", "origin/main", "--", ".gitignore"],
      {
        encoding: "utf-8",
      },
    );
    if (alterado.trim().length > 0) return; // a branch de fato mexeu nele; nada a provar aqui
    expect(compararComMain(".gitignore")).toBe("intacto");
  });
});
