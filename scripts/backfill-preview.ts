#!/usr/bin/env bun
/**
 * Preview read-only de backfill de quantidade estruturada (R2-C / MVP-E1-08).
 *
 * POR QUE ELE EXISTE
 *
 * R2-A cria `package_type`, `quantity_value` e `quantity_unit` vazios em toda linha. Em
 * algum momento alguém precisa preenchê-los, e a única fonte disponível é `size_text` —
 * texto livre, escrito à mão, sete produtos com sete formatos diferentes.
 *
 * Fazer essa conversão linha a linha no editor SQL é como se erra em silêncio: um `1 L`
 * lido como `1 un` não dá erro em lugar nenhum, só faz o preço por litro sair mil vezes
 * errado. Este relatório existe para que a decisão seja tomada olhando uma tabela, e não
 * digitando `UPDATE`.
 *
 * O QUE ELE NÃO FAZ, E NÃO PODE FAZER
 *
 * Não escreve. Não abre conexão. Não fala com Supabase, staging ou produção. Não gera
 * `UPDATE`, `INSERT` nem `DELETE`. Não decide nada: cada linha sai **classificada**, e a
 * classificação é o que um humano revisa.
 *
 * `scripts/backfill-preview.test.ts` prova isso estruturalmente — o próprio arquivo é
 * lido e verificado contra a lista de comandos e clientes proibidos.
 *
 * COMO RODAR
 *
 *   bun scripts/backfill-preview.ts <arquivo.json>
 *
 * onde `arquivo.json` é um array de objetos com `id`, `name`, `brand`, `variant` e
 * `size_text`. Consulta read-only para gerar a entrada, no editor SQL do ambiente alvo:
 *
 *   SELECT id, name, brand, variant, size_text FROM public.products;
 *
 * Nenhuma credencial é lida por este script.
 */
import { readFileSync } from "node:fs";
import { normalizeQuantity } from "@/lib/quantity";
import { parseSizeText } from "@/lib/size-text";
import type { NormalizedQuantity, PackageType, QuantityUnit } from "@/types/domain";

export interface LinhaProduto {
  id: string;
  name: string;
  brand?: string | null;
  variant?: string | null;
  size_text?: string | null;
}

/**
 * O estado de cada linha no relatório. Seis valores, e a fronteira entre eles é sempre a
 * mesma pergunta: **um humano precisa olhar esta linha?**
 */
export type EstadoProposta =
  /** leitura única e sem ressalva; ainda assim entra no banco só por aprovação humana */
  | "proposta_segura"
  /** há quantidade, mas mais de uma leitura é defensável */
  | "ambigua"
  /** o texto não sustenta quantidade nas cinco unidades do MVP */
  | "nao_suportada"
  /** não há `size_text` */
  | "ausente"
  /** a leitura é boa, mas a proposta bate com outra linha do mesmo lote */
  | "conflito"
  /** leu, mas a conversão não sobrevive à aritmética */
  | "exige_revisao";

export interface Proposta {
  product_id: string;
  texto_original: string | null;
  /** O que seria gravado, se aprovado. `null` em todo estado que não é `proposta_segura`. */
  proposta: {
    quantity_value: number;
    quantity_unit: QuantityUnit;
    package_type: PackageType | null;
    units_per_package: number | null;
  } | null;
  estado: EstadoProposta;
  razao: string;
  /** Grandeza base — o que o índice de identidade exata usaria. */
  normalizado: NormalizedQuantity | null;
  /** Campos que continuariam `NULL` mesmo se esta proposta fosse aprovada. */
  permanece_null: readonly string[];
  acao_recomendada: string;
}

/**
 * `package_type` NUNCA sai daqui preenchido a partir de texto, com uma exceção estreita:
 * `pack`, e só quando o texto conta itens repetidos de forma explícita (`"12 rolos"`,
 * `"6 x 350 ml"`). Vidro, lata, garrafa e sachê não são inferidos — embalagem é campo de
 * identidade, e identidade lida de texto livre é o que o princípio 3 proíbe.
 *
 * Ou seja: mesmo na melhor proposta, `package_type` costuma ficar `null` e depende de
 * alguém olhar o produto. Isso é a resposta certa, não uma limitação da ferramenta.
 */
function camposQuePermanecemNull(
  packageType: PackageType | null,
  unitsPerPackage: number | null,
): string[] {
  const restantes: string[] = [];
  if (packageType === null) restantes.push("package_type");
  if (unitsPerPackage === null) restantes.push("units_per_package");
  return restantes;
}

/** Classifica uma linha. Função pura: mesma entrada, mesma saída, sempre. */
export function proporLinha(linha: LinhaProduto): Proposta {
  const texto = linha.size_text ?? null;
  const leitura = parseSizeText(texto);

  const base = {
    product_id: linha.id,
    texto_original: texto,
    proposta: null,
    normalizado: null,
    permanece_null: ["package_type", "quantity_value", "quantity_unit", "units_per_package"],
  } as const;

  switch (leitura.status) {
    case "missing":
      return {
        ...base,
        estado: "ausente",
        razao: "size_text vazio ou não informado",
        acao_recomendada: "preencher quantidade à mão, conferindo a embalagem",
      };

    case "unsupported":
      return {
        ...base,
        estado: "nao_suportada",
        razao:
          leitura.unsupported === "no_quantity"
            ? "o texto não declara quantidade nenhuma"
            : "o texto declara uma unidade fora das cinco do MVP",
        acao_recomendada:
          leitura.unsupported === "no_quantity"
            ? "preencher à mão, conferindo a embalagem"
            : "decidir se o produto é comparável no MVP; não converter por analogia",
      };

    case "ambiguous":
      return {
        ...base,
        estado: "ambigua",
        razao:
          leitura.ambiguity === "variable_weight"
            ? "peso variável, granel, aproximação ou faixa — fora do escopo comparável (§4.3)"
            : leitura.ambiguity === "unit_missing"
              ? "há número, mas nenhuma unidade: pode ser g, ml ou un"
              : "o texto admite mais de uma leitura",
        acao_recomendada:
          leitura.ambiguity === "variable_weight"
            ? "deixar sem quantidade estruturada; o produto não entra na comparação exata"
            : "ler a embalagem e preencher à mão; não escolher uma das leituras no escuro",
      };

    case "parsed": {
      const normalizado = normalizeQuantity(leitura.quantity);
      if (normalizado.status !== "ok") {
        // Chegar aqui significa que o parser produziu um número que a aritmética recusa.
        // Não é impossível — é exatamente o tipo de coisa que um relatório precisa mostrar
        // em vez de engolir.
        return {
          ...base,
          estado: "exige_revisao",
          razao: `a leitura produziu uma quantidade que não sobrevive à conversão (${normalizado.rejection})`,
          acao_recomendada: "conferir o texto de origem; provavelmente é erro de cadastro",
        };
      }

      return {
        product_id: linha.id,
        texto_original: texto,
        proposta: {
          quantity_value: leitura.quantity.value,
          quantity_unit: leitura.quantity.unit,
          package_type: leitura.packageHint,
          units_per_package: leitura.unitsPerPackage,
        },
        estado: "proposta_segura",
        razao: `leitura única pelo método ${leitura.method}`,
        normalizado: normalizado.quantity,
        permanece_null: camposQuePermanecemNull(leitura.packageHint, leitura.unitsPerPackage),
        acao_recomendada:
          leitura.packageHint === null
            ? "conferir a embalagem e preencher package_type; a quantidade pode ser aprovada"
            : "conferir e aprovar",
      };
    }
  }
}

/**
 * Marca como `conflito` as propostas que colidiriam entre si.
 *
 * Duas linhas cuja proposta produz a mesma identidade estruturada não podem ser aprovadas
 * as duas: o índice único de R2-A recusaria a segunda. Descobrir isso aqui, num relatório,
 * é muito melhor do que descobrir no meio de um `UPDATE` — e o caso é real, porque
 * `"500 g"` e `"0,5 kg"` convergem de propósito, e duas linhas assim podem existir
 * justamente por o modelo textual de hoje não conseguir uni-las.
 *
 * A comparação usa nome, marca, variante e a quantidade NORMALIZADA — não o texto.
 */
export function marcarConflitos(
  linhas: readonly LinhaProduto[],
  propostas: readonly Proposta[],
): Proposta[] {
  const porChave = new Map<string, string[]>();

  propostas.forEach((proposta, i) => {
    if (proposta.estado !== "proposta_segura" || proposta.normalizado === null) return;
    const linha = linhas[i];
    const chave = [
      (linha.name ?? "").trim().toLowerCase(),
      (linha.brand ?? "").trim().toLowerCase(),
      (linha.variant ?? "").trim().toLowerCase(),
      proposta.proposta?.package_type ?? "",
      proposta.normalizado.unit,
      String(proposta.normalizado.value),
    ].join(" ");
    porChave.set(chave, [...(porChave.get(chave) ?? []), proposta.product_id]);
  });

  const emConflito = new Set(
    [...porChave.values()].filter((ids) => ids.length > 1).flatMap((ids) => ids),
  );

  return propostas.map((proposta) =>
    emConflito.has(proposta.product_id) && proposta.estado === "proposta_segura"
      ? {
          ...proposta,
          estado: "conflito" as const,
          razao: `${proposta.razao} — mas a proposta colide com outra linha do lote`,
          acao_recomendada:
            "decidir se são o mesmo produto; unir ou separar é decisão do Founder/PMO",
        }
      : proposta,
  );
}

/** O relatório inteiro, na ordem de entrada. Determinístico. */
export function preverBackfill(linhas: readonly LinhaProduto[]): Proposta[] {
  return marcarConflitos(linhas, linhas.map(proporLinha));
}

const ORDEM_ESTADOS: readonly EstadoProposta[] = [
  "proposta_segura",
  "conflito",
  "ambigua",
  "nao_suportada",
  "exige_revisao",
  "ausente",
];

export function formatarRelatorio(propostas: readonly Proposta[]): string {
  const linhas: string[] = [];
  linhas.push("=== PREVIEW DE BACKFILL DE QUANTIDADE (read-only) ===");
  linhas.push("");
  linhas.push(`Linhas analisadas: ${propostas.length}`);
  for (const estado of ORDEM_ESTADOS) {
    const total = propostas.filter((p) => p.estado === estado).length;
    if (total > 0) linhas.push(`  ${estado}: ${total}`);
  }
  linhas.push("");
  linhas.push("NADA FOI ESCRITO. Este relatório é insumo de decisão humana.");
  linhas.push("");

  for (const estado of ORDEM_ESTADOS) {
    const doEstado = propostas.filter((p) => p.estado === estado);
    if (doEstado.length === 0) continue;
    linhas.push(`--- ${estado.toUpperCase()} (${doEstado.length}) ---`);
    for (const p of doEstado) {
      linhas.push(`  ${p.product_id}`);
      linhas.push(`    texto:      ${JSON.stringify(p.texto_original)}`);
      linhas.push(
        `    proposta:   ${
          p.proposta === null
            ? "—"
            : `${p.proposta.quantity_value} ${p.proposta.quantity_unit}` +
              (p.proposta.package_type ? ` (${p.proposta.package_type})` : "") +
              (p.proposta.units_per_package ? ` x${p.proposta.units_per_package}` : "")
        }`,
      );
      linhas.push(
        `    normalizado: ${p.normalizado === null ? "—" : `${p.normalizado.value} ${p.normalizado.unit}`}`,
      );
      linhas.push(`    razão:      ${p.razao}`);
      linhas.push(`    fica null:  ${p.permanece_null.join(", ") || "—"}`);
      linhas.push(`    ação:       ${p.acao_recomendada}`);
      linhas.push("");
    }
  }

  const seguras = propostas.filter((p) => p.estado === "proposta_segura").length;
  linhas.push(
    seguras === propostas.length
      ? "Todas as linhas produziram proposta única. Ainda assim: aprovar é ato humano."
      : `${propostas.length - seguras} linha(s) exigem decisão humana antes de qualquer escrita.`,
  );
  return linhas.join("\n");
}

if (import.meta.main) {
  const caminho = process.argv[2];
  if (caminho === undefined) {
    console.error("uso: bun scripts/backfill-preview.ts <arquivo.json>");
    process.exit(2);
  }
  const linhas = JSON.parse(readFileSync(caminho, "utf-8")) as LinhaProduto[];
  console.log(formatarRelatorio(preverBackfill(linhas)));
  // Sempre 0: um relatório com linhas ambíguas não é uma falha, é o resultado esperado.
  // Falhar aqui empurraria alguém a "consertar" o relatório em vez de lê-lo.
  process.exit(0);
}
