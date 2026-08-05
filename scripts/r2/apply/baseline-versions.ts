#!/usr/bin/env bun
/**
 * R2.6 — imprime as sete versões do baseline, separadas por espaço, para a CLI oficial.
 *
 * Existe como script, e não como lista escrita no shell, para que a lista tenha UM dono:
 * `operations.ts`, que tem teste. Uma segunda cópia no `run.sh` divergiria da primeira, e
 * divergiria adotando a versão errada — que é o tipo de erro que ninguém percebe até o
 * `db push` seguinte tentar reaplicar uma migration já aplicada.
 */
import { VERSOES_DO_BASELINE } from "./operations";

process.stdout.write(VERSOES_DO_BASELINE.join(" "));
