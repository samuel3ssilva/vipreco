#!/usr/bin/env bun
/**
 * Transforma os fatos coletados pelo preflight remoto num GitHub Job Summary (R2.3 §7).
 *
 * POR QUE ISTO É TYPESCRIPT E NÃO SHELL
 *
 * A parte arriscada do preflight — abrir conexão, ler secret — é shell fino e sem
 * decisão. A parte que DECIDE — classificar os dados, comparar migrations, dizer quais
 * gates passam — mora aqui, porque decisão sem teste é palpite. `preflight.test.ts`
 * exercita cada classificação com fatos sintéticos, inclusive os casos que ninguém quer
 * descobrir ao vivo: banco vazio, histórico ilegível, dado real presente.
 *
 * ENTRADA: um arquivo de fatos, uma linha por fato, no formato `chave|valor`. Chaves
 * repetidas viram lista (é assim que `schema.column` e `history.version` chegam).
 *
 * SAÍDA: Markdown. Nada aqui imprime connection string, senha, token, host completo,
 * GTIN completo nem linha de tabela — os fatos que chegam já vêm sanitizados da origem,
 * e `preflight.test.ts` confere que o texto produzido continua limpo.
 */
import { readFileSync } from "node:fs";

export type Fatos = Map<string, string[]>;

export function lerFatos(texto: string): Fatos {
  const fatos: Fatos = new Map();
  for (const linha of texto.split("\n")) {
    const corte = linha.indexOf("|");
    if (corte <= 0) continue;
    const chave = linha.slice(0, corte).trim();
    const valor = linha.slice(corte + 1).trim();
    const lista = fatos.get(chave);
    if (lista) lista.push(valor);
    else fatos.set(chave, [valor]);
  }
  return fatos;
}

export function um(fatos: Fatos, chave: string): string | null {
  return fatos.get(chave)?.[0] ?? null;
}

export function todos(fatos: Fatos, chave: string): string[] {
  return fatos.get(chave) ?? [];
}

/** `total=7,demo=7,real=0` → `{total: 7, demo: 7, real: 0}`. */
export function campos(valor: string | null): Record<string, number> {
  const saida: Record<string, number> = {};
  if (valor === null) return saida;
  for (const par of valor.split(",")) {
    const [k, v] = par.split("=");
    if (k !== undefined && v !== undefined && /^\d+$/.test(v.trim())) {
      saida[k.trim()] = Number(v.trim());
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------------
// Classificação do histórico de migrations (A–E)
// ---------------------------------------------------------------------------------

export type EstadoHistorico =
  /** remoto e local batem exatamente */
  | "A. ALIGNED"
  /** a tabela de histórico não existe no ambiente */
  | "B. HISTORY MISSING"
  /** o remoto tem versões que o repositório não tem */
  | "C. REMOTE AHEAD"
  /** o repositório tem versões que o remoto não tem */
  | "D. LOCAL AHEAD"
  /** não foi possível ler o suficiente para decidir */
  | "E. UNKNOWN";

export interface Historico {
  estado: EstadoHistorico;
  soRemoto: string[];
  soLocal: string[];
  explicacao: string;
}

export function classificarHistorico(
  presente: string | null,
  remotas: string[],
  locais: string[],
): Historico {
  if (presente === null) {
    return {
      estado: "E. UNKNOWN",
      soRemoto: [],
      soLocal: [],
      explicacao:
        "o preflight não chegou a responder se a tabela de histórico existe. É um limite da medição, não uma afirmação sobre o banco.",
    };
  }
  if (presente !== "true") {
    return {
      estado: "B. HISTORY MISSING",
      soRemoto: [],
      soLocal: [...locais],
      explicacao:
        "`supabase_migrations.schema_migrations` não existe neste ambiente. Isso não autoriza `migration repair` nem marcação manual de versão — autoriza investigar como o schema chegou aqui.",
    };
  }

  const conjuntoLocal = new Set(locais);
  const conjuntoRemoto = new Set(remotas);
  const soRemoto = remotas.filter((v) => !conjuntoLocal.has(v)).sort();
  const soLocal = locais.filter((v) => !conjuntoRemoto.has(v)).sort();

  if (soRemoto.length === 0 && soLocal.length === 0) {
    return {
      estado: "A. ALIGNED",
      soRemoto,
      soLocal,
      explicacao: `as ${locais.length} migrations versionadas são exatamente as aplicadas neste ambiente.`,
    };
  }
  if (soRemoto.length > 0) {
    return {
      estado: "C. REMOTE AHEAD",
      soRemoto,
      soLocal,
      explicacao:
        "o ambiente tem versão aplicada que não existe no repositório. Alguém escreveu fora do fluxo versionado, e descobrir quem e o quê vem antes de qualquer aplicação.",
    };
  }
  return {
    estado: "D. LOCAL AHEAD",
    soRemoto,
    soLocal,
    explicacao:
      "o repositório tem migration que este ambiente ainda não recebeu. É o estado esperado antes de uma aplicação autorizada — e continua não autorizando nada por si só.",
  };
}

// ---------------------------------------------------------------------------------
// Classificação dos dados
// ---------------------------------------------------------------------------------

export type ClasseDeDados = "EMPTY" | "DEMO ONLY" | "MIXED OR UNKNOWN";

export interface Dados {
  classe: ClasseDeDados;
  explicacao: string;
  totais: Record<string, Record<string, number>>;
}

const TABELAS_DE_CONTEUDO = ["markets", "products", "prices"] as const;
const TABELAS_DE_SUBMISSAO = [
  "price_submissions",
  "product_watch_requests",
  "decision_feedback",
] as const;

export function classificarDados(fatos: Fatos): Dados {
  const totais: Record<string, Record<string, number>> = {};
  let algumaLida = false;

  for (const t of TABELAS_DE_CONTEUDO) {
    const bruto = um(fatos, `count.${t}`);
    if (bruto !== null) algumaLida = true;
    totais[t] = campos(bruto);
  }
  for (const t of TABELAS_DE_SUBMISSAO) {
    const bruto = um(fatos, `count.${t}`);
    if (bruto !== null) {
      algumaLida = true;
      totais[t] = { total: Number(bruto) };
    }
  }

  if (!algumaLida) {
    return {
      classe: "MIXED OR UNKNOWN",
      explicacao:
        "nenhuma contagem foi lida. Sem número não há classificação, e `UNKNOWN` é a resposta honesta — não `EMPTY`.",
      totais,
    };
  }

  const soma = (campo: string) =>
    Object.values(totais).reduce((acc, t) => acc + (t[campo] ?? 0), 0);

  const total = soma("total");
  if (total === 0) {
    return {
      classe: "EMPTY",
      explicacao: "todas as tabelas lidas estão vazias.",
      totais,
    };
  }

  const real = soma("real");
  const submissoes = TABELAS_DE_SUBMISSAO.reduce((acc, t) => acc + (totais[t]?.total ?? 0), 0);

  if (real === 0 && submissoes === 0) {
    return {
      classe: "DEMO ONLY",
      explicacao:
        "toda linha lida tem `is_demo = true`, e as três tabelas de submissão estão vazias. Diferente da medição anônima de R2.2, aqui as linhas INATIVAS também entraram na conta.",
      totais,
    };
  }
  return {
    classe: "MIXED OR UNKNOWN",
    explicacao:
      real > 0
        ? `há ${real} linha(s) com \`is_demo = false\`. Enquanto existir dado não-demo, R2 não pode ser aplicada sem decisão explícita sobre esse dado.`
        : `as tabelas de submissão têm ${submissoes} linha(s). Nenhuma delas deveria ter conteúdo — a superfície pública de escrita foi fechada na Onda 3.`,
    totais,
  };
}

// ---------------------------------------------------------------------------------
// Gates verificáveis por leitura
// ---------------------------------------------------------------------------------

export type Veredito = "PASS" | "FAIL" | "UNKNOWN";
export interface Gate {
  id: string;
  condicao: string;
  veredito: Veredito;
  base: string;
}

const COLUNAS_DE_R2A = [
  "products.package_type",
  "products.quantity_value",
  "products.quantity_unit",
  "products.units_per_package",
] as const;

export function avaliarGates(fatos: Fatos, historico: Historico, dados: Dados): Gate[] {
  const colunas = todos(fatos, "schema.column").map((c) => c.split(":")[0]);
  const r2aPresentes = COLUNAS_DE_R2A.filter((c) => colunas.includes(c));
  const gtin = campos(um(fatos, "gtin.resumo"));
  const leuGtin = um(fatos, "gtin.resumo") !== null;

  return [
    {
      id: "G3",
      condicao: "histórico remoto classificado como ALIGNED",
      veredito: historico.estado === "A. ALIGNED" ? "PASS" : "FAIL",
      base: `estado ${historico.estado} — ${historico.explicacao}`,
    },
    {
      id: "G4",
      condicao: "schema anterior a R2 compatível",
      veredito: colunas.length === 0 ? "UNKNOWN" : r2aPresentes.length === 0 ? "PASS" : "FAIL",
      base:
        colunas.length === 0
          ? "nenhuma coluna foi lida"
          : r2aPresentes.length === 0
            ? `${colunas.length} colunas lidas; nenhuma das quatro de R2-A está presente, como esperado antes da aplicação`
            : `R2-A parece já aplicada: ${r2aPresentes.join(", ")}`,
    },
    {
      id: "G5",
      condicao: "dados DEMO ONLY ou EMPTY",
      veredito:
        dados.classe === "MIXED OR UNKNOWN"
          ? um(fatos, "count.products") === null
            ? "UNKNOWN"
            : "FAIL"
          : "PASS",
      base: `${dados.classe} — ${dados.explicacao}`,
    },
    {
      id: "G7",
      condicao: "target-readiness executado no ambiente alvo",
      veredito:
        um(fatos, "readiness.status") === "ok"
          ? "PASS"
          : um(fatos, "readiness.status") === null
            ? "UNKNOWN"
            : "FAIL",
      base: um(fatos, "readiness.detalhe") ?? "não executado",
    },
    {
      id: "G8",
      condicao: "zero GTIN inválido ou duplicado",
      veredito: !leuGtin
        ? "UNKNOWN"
        : (gtin.invalidos ?? 0) === 0 && (gtin.duplicados ?? 0) === 0
          ? "PASS"
          : "FAIL",
      base: leuGtin
        ? `preenchidos=${gtin.preenchidos ?? 0}, inválidos=${gtin.invalidos ?? 0}, duplicados=${gtin.duplicados ?? 0}`
        : "auditoria de GTIN não foi lida",
    },
    {
      id: "G13",
      condicao: "nenhum dado real",
      veredito:
        dados.classe === "EMPTY" || dados.classe === "DEMO ONLY"
          ? "PASS"
          : um(fatos, "count.products") === null
            ? "UNKNOWN"
            : "FAIL",
      base: dados.explicacao,
    },
    {
      id: "G14",
      condicao: "nenhuma alteração de RLS",
      veredito: "PASS",
      base: "o preflight é read-only por construção: transação READ ONLY, ROLLBACK ao final, e nenhuma escrita emitida",
    },
  ];
}

// ---------------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------------

function tabela(cabecalho: string[], linhas: string[][]): string {
  if (linhas.length === 0) return "_(nada a listar)_\n";
  return [
    `| ${cabecalho.join(" | ")} |`,
    `| ${cabecalho.map(() => "---").join(" | ")} |`,
    ...linhas.map((l) => `| ${l.join(" | ")} |`),
  ].join("\n");
}

const SIMBOLO: Record<Veredito, string> = { PASS: "✅", FAIL: "❌", UNKNOWN: "⚠️" };

export function renderizar(fatos: Fatos, locais: readonly string[]): string {
  const historico = classificarHistorico(
    um(fatos, "history.table_present"),
    todos(fatos, "history.version"),
    [...locais],
  );
  const dados = classificarDados(fatos);
  const gates = avaliarGates(fatos, historico, dados);

  const colunas = todos(fatos, "schema.column");
  const r2aPresentes = COLUNAS_DE_R2A.filter((c) =>
    colunas.map((x) => x.split(":")[0]).includes(c),
  );

  const preview = todos(fatos, "preview.estado").map((p) => p.split("="));
  const invalidos = todos(fatos, "gtin.invalido");

  const partes: string[] = [];

  partes.push("# Preflight remoto de staging — R2");
  partes.push("");
  partes.push(
    "Leitura, e só leitura. Transação `READ ONLY`, `ROLLBACK` ao final, nenhuma migration aplicada, nenhuma linha escrita, banco de produção não contatado.",
  );
  partes.push("");

  partes.push("## 1. Identificação");
  partes.push("");
  partes.push(
    tabela(
      ["", ""],
      [
        ["`main` no momento da execução", `\`${um(fatos, "run.main_sha") ?? "?"}\``],
        ["Horário (UTC)", um(fatos, "db.now_utc") ?? "?"],
        ["Ambiente declarado", um(fatos, "run.environment") ?? "?"],
        ["Project ref (últimos caracteres)", `\`…${um(fatos, "run.ref_sufixo") ?? "?"}\``],
        ["Impressão digital do host", `\`${um(fatos, "run.host_hash") ?? "?"}\``],
        ["Banco", `\`${um(fatos, "db.name") ?? "?"}\``],
        ["Usuário lógico", `\`${um(fatos, "db.user") ?? "?"}\``],
        ["PostgreSQL", um(fatos, "db.version") ?? "?"],
        ["Transação read-only confirmada no banco", `\`${um(fatos, "guard.read_only") ?? "?"}\``],
      ],
    ),
  );
  partes.push("");
  partes.push(
    "A URL completa, o host e a senha nunca aparecem aqui nem no log: o que se publica é um hash truncado do host e os últimos caracteres do project ref — suficiente para conferir **qual** ambiente foi lido, insuficiente para alcançá-lo.",
  );
  partes.push("");

  partes.push("## 2. Histórico de migrations");
  partes.push("");
  partes.push(`**Estado: ${historico.estado}** — ${historico.explicacao}`);
  partes.push("");
  partes.push(
    tabela(
      ["", ""],
      [
        ["Versões no repositório", String(locais.length)],
        ["Versões aplicadas no ambiente", String(todos(fatos, "history.version").length)],
        [
          "Só no ambiente",
          historico.soRemoto.length ? `\`${historico.soRemoto.join("`, `")}\`` : "nenhuma",
        ],
        [
          "Só no repositório",
          historico.soLocal.length ? `\`${historico.soLocal.join("`, `")}\`` : "nenhuma",
        ],
      ],
    ),
  );
  partes.push("");

  partes.push("## 3. Schema");
  partes.push("");
  partes.push(
    tabela(
      ["", ""],
      [
        ["Colunas em `public`", String(colunas.length)],
        ["Constraints", String(todos(fatos, "schema.constraint").length)],
        ["Índices", String(todos(fatos, "schema.index").length)],
        ["Funções", String(todos(fatos, "schema.function").length)],
        ["Policies", String(todos(fatos, "schema.policy").length)],
        [
          "Tabelas com RLS ligada",
          String(todos(fatos, "schema.rls").filter((r) => r.includes(":true:")).length),
        ],
        [
          "Colunas de R2-A presentes",
          r2aPresentes.length === 0
            ? "nenhuma (esperado antes da aplicação)"
            : `\`${r2aPresentes.join("`, `")}\``,
        ],
      ],
    ),
  );
  partes.push("");
  const naoValidadas = todos(fatos, "schema.constraint").filter((c) => c.endsWith(":NOT VALID"));
  if (naoValidadas.length > 0) {
    partes.push("Constraints em `NOT VALID`:");
    partes.push("");
    for (const c of naoValidadas) partes.push(`- \`${c.replace(":NOT VALID", "")}\``);
    partes.push("");
  }

  partes.push("## 4. Dados");
  partes.push("");
  partes.push(`**Classificação: ${dados.classe}** — ${dados.explicacao}`);
  partes.push("");
  partes.push(
    tabela(
      ["Tabela", "Total", "Demo", "Real", "Ativas"],
      Object.entries(dados.totais).map(([t, v]) => [
        `\`${t}\``,
        v.total === undefined ? "—" : String(v.total),
        v.demo === undefined ? "—" : String(v.demo),
        v.real === undefined ? "—" : String(v.real),
        v.ativos === undefined ? "—" : String(v.ativos),
      ]),
    ),
  );
  partes.push("");

  partes.push("## 5. GTIN");
  partes.push("");
  const gtin = campos(um(fatos, "gtin.resumo"));
  partes.push(
    tabela(
      ["", ""],
      [
        ["Preenchidos", String(gtin.preenchidos ?? "—")],
        ["Inválidos", String(gtin.invalidos ?? "—")],
        ["Duplicados", String(gtin.duplicados ?? "—")],
      ],
    ),
  );
  partes.push("");
  if (invalidos.length > 0) {
    partes.push(
      "Linhas com GTIN inválido — o código sai **mascarado**, com só os quatro últimos dígitos:",
    );
    partes.push("");
    partes.push(
      tabela(
        ["`id` do produto", "GTIN (mascarado)", "Motivo"],
        invalidos.map((linha) => {
          const [id, mascarado, motivo] = linha.split(":");
          return [`\`${id}\``, `\`${mascarado}\``, motivo ?? ""];
        }),
      ),
    );
    partes.push("");
    partes.push(
      "**Isto não é curadoria de GTIN.** Corrigir ou anular código é decisão do Founder/PMO, nunca automática — o ViPreço não inventa GTIN. E vale a distinção que o gate existe para preservar: aplicar R2-B **passaria**, porque a constraint nasce `NOT VALID` e não confere linha existente; quem falharia é o `VALIDATE CONSTRAINT` da FASE 6.",
    );
    partes.push("");
  }

  partes.push("## 6. Preview de quantidade");
  partes.push("");
  if (preview.length === 0) {
    partes.push("_Não executado._");
  } else {
    partes.push(
      tabela(
        ["Estado", "Linhas"],
        preview.map(([estado, n]) => [`\`${estado}\``, n ?? "0"]),
      ),
    );
    partes.push("");
    partes.push(
      "Só a contagem por estado é publicada. O relatório linha a linha e o arquivo intermediário não vão para o log nem para artefato.",
    );
  }
  partes.push("");

  partes.push("## 7. Gates verificáveis por leitura");
  partes.push("");
  partes.push(
    tabela(
      ["#", "Condição", "", "Base"],
      gates.map((g) => [g.id, g.condicao, SIMBOLO[g.veredito] + " " + g.veredito, g.base]),
    ),
  );
  partes.push("");
  partes.push(
    "Os demais gates (G1, G2, G6, G9–G12, G15) não são decididos por leitura de banco e continuam onde estão, em [`docs/data/R2-APPLICATION-GATE.md`](../../docs/data/R2-APPLICATION-GATE.md).",
  );
  partes.push("");

  const reprovados = gates.filter((g) => g.veredito === "FAIL");
  const desconhecidos = gates.filter((g) => g.veredito === "UNKNOWN");

  partes.push("## 8. Recomendação");
  partes.push("");
  if (reprovados.length === 0 && desconhecidos.length === 0) {
    partes.push(
      "Todos os gates verificáveis por leitura passaram. Isso **não** autoriza aplicar nada: G1, G2, G6, G9–G12 e G15 são decisão humana e vivem fora deste relatório.",
    );
  } else {
    partes.push(
      `${reprovados.length} gate(s) reprovado(s) e ${desconhecidos.length} indeterminado(s). **Nenhuma migration deve ser aplicada.**`,
    );
    partes.push("");
    for (const g of [...reprovados, ...desconhecidos]) {
      partes.push(`- **${g.id}** — ${g.condicao}: ${g.base}`);
    }
  }
  partes.push("");
  partes.push("---");
  partes.push("");
  partes.push(
    "O que este workflow **não** faz, em nenhuma circunstância: aplicar migration, executar backfill, escrever linha, corrigir GTIN, rodar `VALIDATE CONSTRAINT`, alterar RLS ou grants, tocar em produção. A remediação de qualquer achado acima é missão posterior, com gate humano.",
  );

  return partes.join("\n");
}

if (import.meta.main) {
  const caminhoFatos = process.argv[2];
  const caminhoMigrations = process.argv[3];
  if (caminhoFatos === undefined || caminhoMigrations === undefined) {
    console.error("uso: bun render-summary.ts <fatos.txt> <migrations-locais.txt>");
    process.exit(2);
  }
  const locais = readFileSync(caminhoMigrations, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  console.log(renderizar(lerFatos(readFileSync(caminhoFatos, "utf-8")), locais));
}
