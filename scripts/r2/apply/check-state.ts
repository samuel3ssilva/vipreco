#!/usr/bin/env bun
/**
 * R2.6 — as pré-condições, medidas contra o banco e decididas por `operations.ts`.
 *
 * Sai em 1 com os motivos no stderr quando a operação não pode rodar. O runner publica
 * esses motivos e aborta ANTES de qualquer escrita.
 *
 * Também imprime, no stdout, o bloco que vai para o Job Summary e as três variáveis que o
 * runner consome (`historico_antes`, `historico_depois`, `versao_alvo`).
 */
import { lerFatos, medir } from "./fatos";
import { OPERACOES, ehOperacao, podeExecutar, proximaOperacao } from "./operations";

const [operacao = "", caminhoFatos = ""] = process.argv.slice(2);

if (!ehOperacao(operacao)) {
  console.error(`Operacao desconhecida: '${operacao}'.`);
  process.exit(1);
}

const fatos = lerFatos(caminhoFatos);
const medicao = medir(fatos);
const definicao = OPERACOES[operacao];

// Conteúdo não lido é motivo de recusa, e não de seguir com `0`. `gtin.invalidos = 0`
// significa "não há inválidos"; `gtin.resumo` ausente significa "ninguém olhou" — e tratar
// os dois igual é como uma medição que falhou vira uma autorização.
if (!medicao.leuConteudo && definicao.escreve) {
  console.error(
    "As contagens e a auditoria de GTIN nao puderam ser lidas. Uma operacao de escrita nao roda sobre medicao ausente: 'nao ha invalidos' e 'ninguem olhou' nao sao a mesma coisa.",
  );
  process.exit(1);
}

const veredito = podeExecutar(operacao, {
  historicoRemoto: medicao.historicoRemoto,
  gtinsInvalidos: medicao.gtinsInvalidos,
});

if (!veredito.pode) {
  console.error(`Pre-condicoes de '${operacao}' nao satisfeitas:\n`);
  for (const motivo of veredito.motivos) console.error(`  - ${motivo}`);
  const proxima = proximaOperacao({
    historicoRemoto: medicao.historicoRemoto,
    gtinsInvalidos: medicao.gtinsInvalidos,
  });
  console.error(
    `\nA operacao que o estado atual admite e: ${proxima ?? "nenhuma — a sequencia terminou"}.`,
  );
  process.exit(1);
}

const linhas = Object.entries(medicao.linhas)
  .map(([tabela, valor]) => `| \`${tabela}\` | ${valor ?? "não lido"} |`)
  .join("\n");

process.stdout.write(
  [
    "### Estado medido antes da operação",
    "",
    "| Fato | Valor |",
    "| --- | --- |",
    `| histórico remoto de migrations | ${medicao.historicoRemoto} versão(ões) |`,
    `| GTINs inválidos | ${medicao.gtinsInvalidos} |`,
    `| GTINs duplicados | ${medicao.gtinsDuplicados} |`,
    "",
    "| Tabela | Linhas |",
    "| --- | --- |",
    linhas,
    "",
    `**Operação autorizada:** \`${operacao}\` — ${definicao.descricao}.`,
    "",
    `historico_antes=${definicao.historicoAntes ?? medicao.historicoRemoto}`,
    `historico_depois=${definicao.historicoDepois ?? medicao.historicoRemoto}`,
    `versao_alvo=${definicao.versaoAlvo ?? ""}`,
    "",
  ].join("\n"),
);
