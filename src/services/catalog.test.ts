import { describe, expect, it } from "vitest";
import { podeSerIdDeProduto } from "./catalog";

/**
 * A guarda de forma do id de produto.
 *
 * Ela nasceu de uma medição, não de uma hipótese: `/produto/nao-existe` respondia **HTTP 500**
 * em staging. O Postgres recusa o texto malformado como `uuid`, o erro subia como falha de
 * serviço, e quem só editou a URL recebia uma página técnica. Numa demonstração em que o celular
 * passa de mão em mão, esse é o pior erro possível — parece que o produto quebrou.
 *
 * O que a guarda faz e o que ela NÃO faz: ela responde "isto pode ser um id de produto?", uma
 * pergunta de FORMA. Quem responde "este produto existe?" continua sendo o banco. Confundir as
 * duas seria pior do que não ter guarda nenhuma.
 */
describe("podeSerIdDeProduto", () => {
  it("aceita os UUIDs que o seed de demonstração usa", () => {
    expect(podeSerIdDeProduto("22222222-2222-2222-2222-000000000001")).toBe(true);
    expect(podeSerIdDeProduto("11111111-1111-1111-1111-000000000004")).toBe(true);
  });

  it("aceita UUID em maiúsculas — a comparação é do banco, não da caixa", () => {
    expect(podeSerIdDeProduto("22222222-2222-2222-2222-00000000000A".toUpperCase())).toBe(true);
  });

  it.each([
    ["texto qualquer", "nao-existe"],
    ["vazio", ""],
    ["só espaço", " "],
    ["UUID sem um dígito", "22222222-2222-2222-2222-00000000000"],
    ["UUID com um dígito a mais", "22222222-2222-2222-2222-0000000000012"],
    ["UUID sem hífens", "22222222222222222222000000000001"],
    ["caractere fora do hexadecimal", "2222222g-2222-2222-2222-000000000001"],
    ["tentativa de injeção", "1' OR '1'='1"],
    ["caminho", "../../etc/passwd"],
  ])("recusa %s", (_caso, valor) => {
    expect(podeSerIdDeProduto(valor)).toBe(false);
  });
});
