import { execFileSync } from "node:child_process";

/**
 * O guarda de "isto aqui não foi alterado" — uma implementação, dois contratos.
 *
 * =============================================================================
 * POR QUE ELE EXISTE, E POR QUE ELE FALHA EM VEZ DE SILENCIAR
 * =============================================================================
 *
 * Os contratos de laboratório afirmam que a Home, a busca, a comparação e o ranking
 * continuam intactos. `git diff` contra a `main` é a única forma de dar essa garantia sem
 * depender de alguém lembrar de olhar.
 *
 * As duas primeiras versões deste guarda tratavam "não consegui comparar" como
 * **"não mudou"**. Parece prudente e é o contrário: "não mudou" é uma afirmação sobre o
 * repositório, e ela não pode ser feita por quem não mediu nada.
 *
 * E não era hipotético. `actions/checkout` clona com profundidade 1 por padrão, então
 * `origin/main` NÃO EXISTIA no CI — exatamente onde alguém lê o check verde como prova de
 * que a Home continua no lugar. O guarda passava por vacuidade justamente onde ele deveria
 * valer mais. A correção tem duas metades, e nenhuma das duas sozinha resolve:
 *
 *   1. `fetch-depth: 0` em `.github/workflows/ci.yml`, para que a comparação seja possível;
 *   2. este módulo, que **lança** quando ela não for — para que a impossibilidade nunca mais
 *      possa ser lida como sucesso, em nenhum ambiente, presente ou futuro.
 *
 * A segunda metade é a que não caduca. Se alguém remover o `fetch-depth` amanhã, o CI fica
 * vermelho com o motivo escrito, em vez de verde sem ter medido.
 */

/** Levantada quando `origin/main` não existe — nunca confundível com "está tudo intacto". */
export class MainIndisponivelError extends Error {
  constructor(motivo: string) {
    super(
      `${motivo}\n\n` +
        "O guarda compara a árvore de trabalho com `origin/main` e não pode concluir nada " +
        "sem ela. Em CI: `actions/checkout` precisa de `fetch-depth: 0` (clone raso não " +
        "traz `origin/main`). Localmente: `git fetch origin main`.",
    );
    this.name = "MainIndisponivelError";
  }
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
}

/**
 * `origin/main` existe e é resolvível neste ambiente?
 *
 * Esta pergunta é feita explicitamente — e não deduzida de um `catch` — porque é ela que o
 * CI precisa responder em voz alta.
 */
export function mainDisponivel(): boolean {
  try {
    return git(["rev-parse", "--verify", "--quiet", "origin/main"]).trim().length === 40;
  } catch {
    return false;
  }
}

/** Dois estados, e só dois. O terceiro — "não sei" — é um erro, não um valor. */
export type EstadoDoCaminho = "mudou" | "intacto";

/**
 * Compara um caminho da árvore de trabalho com `origin/main`.
 *
 * @throws {MainIndisponivelError} quando a comparação é impossível.
 */
export function compararComMain(caminho: string): EstadoDoCaminho {
  if (!mainDisponivel()) {
    throw new MainIndisponivelError("`origin/main` não existe neste ambiente.");
  }

  // `origin/main` SEM `...HEAD`, de propósito: compara a ÁRVORE DE TRABALHO com a main, e
  // não apenas o que já foi commitado. A primeira versão usava `...HEAD` e um controle
  // positivo a reprovou — antes do commit, o guarda declarava "não mudou" para tudo,
  // inclusive para arquivos que a branch estava criando naquele instante.
  const alterados = git(["diff", "--name-only", "origin/main", "--", caminho]);
  // Arquivo novo ainda não rastreado não aparece em `git diff` nenhum.
  const novos = git(["ls-files", "--others", "--exclude-standard", "--", caminho]);

  return alterados.trim().length > 0 || novos.trim().length > 0 ? "mudou" : "intacto";
}

/**
 * =============================================================================
 * O GUARDA DE ESCOPO — R3.3 EM DIANTE
 * =============================================================================
 *
 * Até R3.2, o contrato era simples: uma lista de caminhos, e nenhum deles podia mudar. R3.3
 * quebra isso, porque **a Home agora está autorizada a mudar**. E um guarda que apenas deixa de
 * proteger o que a onda vai mexer não guarda nada: ele passa a aprovar qualquer diff que por
 * acaso inclua aqueles arquivos, junto com o que mais estiver lá.
 *
 * A inversão: em vez de listar o que não pode mudar, listar o que **pode**, e reprovar todo o
 * resto. A pergunta deixa de ser "a Home continua intacta?" e passa a ser "tudo o que mudou
 * estava autorizado a mudar?".
 *
 * Isso troca uma lista que envelhece por uma que aperta sozinha: um arquivo novo criado fora do
 * allowlist reprova sem ninguém precisar lembrar de adicioná-lo a uma lista de proibidos.
 */

/** Todo caminho que difere de `origin/main`, incluindo arquivos novos ainda não rastreados. */
export function caminhosAlterados(): string[] {
  if (!mainDisponivel()) {
    throw new MainIndisponivelError("`origin/main` não existe neste ambiente.");
  }
  const alterados = git(["diff", "--name-only", "origin/main"]).split("\n");
  const novos = git(["ls-files", "--others", "--exclude-standard"]).split("\n");
  return [...new Set([...alterados, ...novos])].filter((linha) => linha.trim().length > 0).sort();
}

/**
 * Os caminhos que mudaram e **não** estavam autorizados.
 *
 * Um item do allowlist casa por prefixo, para que `docs/evidence/visual/r33/` cubra a pasta
 * inteira sem listar cada PNG. Prefixo é deliberadamente literal: nada de glob, nada de regex.
 * Um padrão que ninguém consegue ler de cabeça é um padrão que um dia autoriza o que não devia.
 *
 * @throws {MainIndisponivelError} quando a comparação é impossível — nunca "nada fora do escopo".
 */
export function foraDoEscopo(permitidos: readonly string[]): string[] {
  return caminhosAlterados().filter(
    (caminho) => !permitidos.some((prefixo) => caminho === prefixo || caminho.startsWith(prefixo)),
  );
}
