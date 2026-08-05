#!/usr/bin/env bun
/**
 * R2.6 — a primeira guarda: a operação existe e a frase é a dela.
 *
 * Roda antes de qualquer conexão. Sai em 1 com a mensagem no stderr, que o runner publica
 * como motivo da recusa.
 */
import { OPERACOES, OPERACOES_VALIDAS, ehOperacao, fraseConfere } from "./operations";

const [operacao = "", frase = ""] = process.argv.slice(2);

if (!ehOperacao(operacao)) {
  console.error(
    `Operacao desconhecida: '${operacao}'. As validas sao: ${OPERACOES_VALIDAS.join(", ")}.`,
  );
  process.exit(1);
}

if (!fraseConfere(operacao, frase)) {
  // A frase esperada NAO e impressa. Imprimi-la transformaria a confirmacao num
  // formulario que se preenche copiando a mensagem de erro -- e o proposito dela e
  // obrigar quem opera a ler qual operacao esta disparando, no runbook.
  console.error(
    `A frase de confirmacao nao e a de '${operacao}'. Ela esta em docs/data/R2-CONTROLLED-APPLY-RUNBOOK.md, e a comparacao e exata: caixa, espacos e pontuacao contam.`,
  );
  process.exit(1);
}

process.stdout.write(`escreve=${OPERACOES[operacao].escreve}\n`);
