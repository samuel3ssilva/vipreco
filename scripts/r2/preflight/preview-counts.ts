#!/usr/bin/env bun
/**
 * Reduz o preview de backfill a contagens por estado (R2.3 §5.9 e §7).
 *
 * `scripts/backfill-preview.ts` devolve um relatório linha a linha — nome, marca,
 * `size_text` e a proposta de cada produto. É exatamente o que um humano precisa ver
 * para aprovar, e exatamente o que **não** deve ir para o log de um workflow: o §6.D do
 * mandato manda publicar só agregado.
 *
 * Então aqui a classificação é a mesma — importada, não reimplementada, porque
 * algoritmo duplicado é algoritmo que diverge —, e o que sai é só a contagem.
 *
 * Entrada: o mesmo JSON que `backfill-preview.ts` consome, produzido por
 * `30-quantity-input.sql`. Saída: `preview.estado|<estado>=<n>`, uma linha por estado,
 * no formato de fatos que `render-summary.ts` lê.
 */
import { readFileSync } from "node:fs";
import { preverBackfill, validarEntrada, type EstadoProposta } from "../../backfill-preview";

/** Todos os estados possíveis, sempre na mesma ordem. Estado com zero também é fato. */
const ESTADOS: readonly EstadoProposta[] = [
  "proposta_segura",
  "ambigua",
  "nao_suportada",
  "ausente",
  "conflito",
  "exige_revisao",
];

export function contarPorEstado(linhas: Parameters<typeof preverBackfill>[0]): string[] {
  const propostas = preverBackfill(linhas);
  return ESTADOS.map(
    (estado) => `preview.estado|${estado}=${propostas.filter((p) => p.estado === estado).length}`,
  );
}

if (import.meta.main) {
  const caminho = process.argv[2];
  if (caminho === undefined) {
    console.error("uso: bun preview-counts.ts <produtos.json>");
    process.exit(2);
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf-8"));
  } catch (erro) {
    console.error(`não foi possível ler ${caminho}: ${(erro as Error).message}`);
    process.exit(2);
  }

  const entrada = validarEntrada(bruto);
  if (!entrada.ok) {
    console.error(`entrada inválida: ${entrada.erro}`);
    process.exit(2);
  }

  for (const linha of contarPorEstado(entrada.linhas)) console.log(linha);
}
