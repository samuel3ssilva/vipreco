#!/usr/bin/env bun
/**
 * R2.4 §5 — compara dois fingerprints de schema e classifica a equivalência.
 *
 * De um lado, um Postgres efêmero com as **oito** migrations anteriores a R2 aplicadas —
 * o estado que o repositório afirma. Do outro, staging lido em transação `READ ONLY` — o
 * estado que existe. A pergunta é uma só: dá para adotar as oito versões como baseline
 * histórico sem inventar procedência?
 *
 * A DECISÃO MORA AQUI, E NÃO NO SHELL, pelo mesmo motivo de `render-summary.ts`: o shell
 * abre conexão e move arquivo, o TypeScript decide — e decisão sem teste é palpite.
 *
 * O QUE PODE SER NORMALIZADO, E POR QUÊ (mandato §5)
 *
 *   espaço em branco        já colapsado no SQL; refeito aqui por garantia.
 *   qualificação equivalente `public.f()` e `f()` designam a mesma função quando o
 *                           schema está no `search_path`. A renderização do Postgres
 *                           varia com o `search_path` de quem lê, e o leitor é diferente
 *                           dos dois lados — `postgres` no drill, `postgres.<ref>` pelo
 *                           pooler em staging. Normalizar prefixo é o que impede essa
 *                           diferença de leitor de virar drift de schema.
 *
 * O QUE NÃO PODE, E TAMBÉM POR QUÊ
 *
 *   Tudo o mais. Expressão, policy, grant, coluna a mais ou a menos, default,
 *   nulabilidade, função, índice, predicado, RLS. Cada um desses é exatamente o tipo de
 *   diferença que a comparação existe para achar, e "normalizar" qualquer um deles seria
 *   escrever um comparador que não pode reprovar.
 */
import { readFileSync } from "node:fs";

export interface Objeto {
  categoria: string;
  identidade: string;
  assinatura: string;
}

/** `fp.coluna|products.gtin|pos=7,tipo=text,...` → categoria, identidade, assinatura. */
export function lerFingerprint(texto: string): Map<string, Objeto> {
  const objetos = new Map<string, Objeto>();
  for (const linha of texto.split("\n")) {
    const bruto = linha.trim();
    if (bruto.length === 0) continue;
    const p1 = bruto.indexOf("|");
    if (p1 <= 0) continue;
    const categoria = bruto.slice(0, p1).trim();
    if (!categoria.startsWith("fp.")) continue;
    const resto = bruto.slice(p1 + 1);
    const p2 = resto.indexOf("|");
    const identidade = (p2 < 0 ? resto : resto.slice(0, p2)).trim();
    const assinatura = p2 < 0 ? "" : resto.slice(p2 + 1).trim();
    /**
     * Colisão de chave NÃO pode descartar um fato.
     *
     * Se duas linhas compartilham categoria e identidade, `set` sobrescreveria a primeira
     * e ela sumiria da comparação sem deixar rastro — e o que sumiria em silêncio seria
     * justamente um dos dois grants, uma das duas policies, um dos dois objetos que
     * alguém precisava ver. Desempatar pela assinatura preserva os dois; linha
     * integralmente repetida continua sendo uma só, que é o correto.
     */
    const chave = `${categoria} ${identidade}`;
    const existente = objetos.get(chave);
    objetos.set(
      existente === undefined || existente.assinatura === assinatura
        ? chave
        : `${chave} ${assinatura}`,
      { categoria, identidade, assinatura },
    );
  }
  return objetos;
}

/**
 * Prefixos de schema que designam a mesma coisa dos dois lados. Lista FECHADA: qualquer
 * outro schema continua aparecendo, e uma função que tivesse migrado para um schema
 * inesperado apareceria como drift, que é o comportamento certo.
 */
const QUALIFICACAO_EQUIVALENTE = /\b(?:public|extensions|pg_catalog)\./g;

export function normalizar(assinatura: string): string {
  return assinatura.replace(QUALIFICACAO_EQUIVALENTE, "").replace(/\s+/g, " ").trim();
}

export type Classificacao = "EXACT EQUIVALENT" | "MATERIAL DRIFT" | "UNKNOWN";

export type TipoDeDiferenca = "só no esperado" | "só no ambiente" | "assinatura diferente";

export interface Diferenca {
  categoria: string;
  identidade: string;
  tipo: TipoDeDiferenca;
  esperado: string | null;
  encontrado: string | null;
}

export interface Comparacao {
  classificacao: Classificacao;
  motivo: string;
  diferencas: Diferenca[];
  objetosComparados: number;
  versaoEsperada: string | null;
  versaoEncontrada: string | null;
}

function versaoMaior(v: string | null): string | null {
  return v === null ? null : (v.split(".")[0] ?? null);
}

// ---------------------------------------------------------------------------------
// Classificação de grants (R2.5 §2)
// ---------------------------------------------------------------------------------

/**
 * As três tabelas centrais da comparação. Escrita pública nelas nunca teve contrato: o
 * produto lê preço, mercado e produto, e quem escreve é operação manual por `service_role`.
 */
const TABELAS_CENTRAIS = ["markets", "prices", "products"] as const;

/**
 * Tabelas cuja escrita pública TEM contrato e policy própria. A Onda 3 revogou o `INSERT`
 * delas, mas as policies continuam lá — e o desenho é esse. Não entram no hardening.
 */
const TABELAS_DE_CONTRIBUICAO = [
  "decision_feedback",
  "price_submissions",
  "product_watch_requests",
] as const;

/** Os quatro que mudam ou destroem linha. `TRUNCATE` está aqui por um motivo específico. */
const PRIVILEGIOS_DE_ESCRITA = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;

const PAPEIS_PUBLICOS = ["anon", "authenticated", "PUBLIC"] as const;

export type CategoriaDeGrant =
  "A. padrão da plataforma" | "B. intencional do aplicativo" | "C. inseguro — exige hardening";

export interface GrantClassificado {
  tabela: string;
  papel: string;
  privilegio: string;
  categoria: CategoriaDeGrant;
  porque: string;
}

/**
 * Separa os grants de tabela de staging em três categorias.
 *
 * POR QUE ISTO NÃO MEXE NO VEREDITO DE EQUIVALÊNCIA
 *
 * Desde R2.5 o lado esperado reproduz os default privileges da plataforma, então esses
 * grants aparecem **dos dois lados** e não geram diferença nenhuma. Isso é o certo para a
 * pergunta "o schema de staging é o das sete migrations?" — e seria péssimo como resposta
 * final, porque tornaria invisível exatamente o achado que motivou a migration de
 * hardening.
 *
 * Modelar para não confundir é uma coisa; modelar para não enxergar é outra. Esta função
 * existe para a segunda não acontecer: o veredito ignora privilégio, o relatório não.
 *
 * `TRUNCATE` está em `PRIVILEGIOS_DE_ESCRITA` de propósito, e é o mais grave dos quatro:
 * no PostgreSQL a RLS **não se aplica** a `TRUNCATE`. Para `INSERT`/`UPDATE`/`DELETE` a
 * ausência de policy nega a operação; para `TRUNCATE`, o privilégio é a única barreira.
 */
export function classificarGrants(fingerprintStaging: string): GrantClassificado[] {
  const fora: GrantClassificado[] = [];
  for (const o of lerFingerprint(fingerprintStaging).values()) {
    if (o.categoria !== "fp.grant_tabela") continue;
    const [tabela, papel, privilegio] = o.identidade.split(":");
    if (tabela === undefined || papel === undefined || privilegio === undefined) continue;

    const publico = (PAPEIS_PUBLICOS as readonly string[]).includes(papel);
    const central = (TABELAS_CENTRAIS as readonly string[]).includes(tabela);
    const contribuicao = (TABELAS_DE_CONTRIBUICAO as readonly string[]).includes(tabela);
    const escrita = (PRIVILEGIOS_DE_ESCRITA as readonly string[]).includes(privilegio);

    let categoria: CategoriaDeGrant;
    let porque: string;
    if (!publico) {
      categoria = "B. intencional do aplicativo";
      porque = `${papel} não é papel público`;
    } else if (privilegio === "SELECT" && (central || contribuicao)) {
      categoria = "B. intencional do aplicativo";
      porque = "leitura pública é o produto; a RLS filtra as linhas";
    } else if (central && escrita) {
      categoria = "C. inseguro — exige hardening";
      porque =
        privilegio === "TRUNCATE"
          ? "a RLS NÃO se aplica a TRUNCATE — o privilégio é a única barreira"
          : "escrita pública em tabela central nunca teve contrato; hoje só a RLS nega";
    } else if (contribuicao && escrita) {
      categoria = "B. intencional do aplicativo";
      porque = "tabela de contribuição tem contrato e policy próprios";
    } else {
      categoria = "A. padrão da plataforma";
      porque = "concedido pelo provisionamento do Supabase, sem efeito de escrita";
    }
    fora.push({ tabela, papel, privilegio, categoria, porque });
  }
  return fora.sort((a, b) =>
    `${a.categoria}${a.tabela}${a.papel}${a.privilegio}`.localeCompare(
      `${b.categoria}${b.tabela}${b.papel}${b.privilegio}`,
    ),
  );
}

/**
 * Linhas de contexto (`fp.db.version`, `fp.guard.read_only`) chegam sem `|` interno, então
 * o valor cai em `identidade` e não em `assinatura`. Procurar pela chave montada não
 * funcionaria — a chave inclui o próprio valor.
 */
function contexto(mapa: Map<string, Objeto>, categoria: string): string | null {
  for (const o of mapa.values()) if (o.categoria === categoria) return o.identidade;
  return null;
}

export function comparar(esperadoTexto: string, encontradoTexto: string): Comparacao {
  const esperado = lerFingerprint(esperadoTexto);
  const encontrado = lerFingerprint(encontradoTexto);

  const versaoEsperada = contexto(esperado, "fp.db.version");
  const versaoEncontrada = contexto(encontrado, "fp.db.version");

  const base = {
    diferencas: [] as Diferenca[],
    objetosComparados: 0,
    versaoEsperada,
    versaoEncontrada,
  };

  if (esperado.size === 0 || encontrado.size === 0) {
    return {
      ...base,
      classificacao: "UNKNOWN",
      motivo:
        "um dos dois fingerprints veio vazio. Comparar contra o nada devolveria 'tudo diferente' ou 'tudo igual' dependendo do lado — as duas respostas seriam invenções.",
    };
  }

  const guardaEncontrado = contexto(encontrado, "fp.guard.read_only");
  if (guardaEncontrado !== null && guardaEncontrado !== "on") {
    return {
      ...base,
      classificacao: "UNKNOWN",
      motivo: `a leitura do ambiente não aconteceu em transação read-only (transaction_read_only='${guardaEncontrado}'). O fingerprint pode estar correto, mas a garantia sob a qual ele foi colhido não vale — e o gate depende das duas coisas.`,
    };
  }

  // As linhas de contexto não são objetos de schema: comparar a versão do Postgres como
  // se fosse um objeto reprovaria toda execução em que os dois lados não fossem o mesmo
  // patch, o que não tem nada a ver com equivalência de schema.
  const CONTEXTO = new Set(["fp.guard.read_only", "fp.db.version"]);

  const chaves = new Set<string>();
  for (const k of esperado.keys()) chaves.add(k);
  for (const k of encontrado.keys()) chaves.add(k);

  const diferencas: Diferenca[] = [];
  let comparados = 0;

  for (const chave of [...chaves].sort()) {
    const a = esperado.get(chave);
    const b = encontrado.get(chave);
    const categoria = (a ?? b)!.categoria;
    if (CONTEXTO.has(categoria)) continue;
    const identidade = (a ?? b)!.identidade;
    comparados += 1;

    if (a === undefined) {
      diferencas.push({
        categoria,
        identidade,
        tipo: "só no ambiente",
        esperado: null,
        encontrado: b!.assinatura,
      });
      continue;
    }
    if (b === undefined) {
      diferencas.push({
        categoria,
        identidade,
        tipo: "só no esperado",
        esperado: a.assinatura,
        encontrado: null,
      });
      continue;
    }
    if (normalizar(a.assinatura) !== normalizar(b.assinatura)) {
      diferencas.push({
        categoria,
        identidade,
        tipo: "assinatura diferente",
        esperado: a.assinatura,
        encontrado: b.assinatura,
      });
    }
  }

  const resultado = { ...base, diferencas, objetosComparados: comparados };

  if (diferencas.length === 0) {
    return {
      ...resultado,
      classificacao: "EXACT EQUIVALENT",
      motivo: `os ${comparados} objetos de \`public\` têm assinatura idêntica dos dois lados. Isso não afirma que os arquivos versionados foram os comandos executados neste ambiente — afirma que o resultado semântico é o mesmo.`,
    };
  }

  /**
   * A ressalva de versão só entra quando HÁ diferença.
   *
   * `pg_get_functiondef` e `pg_get_indexdef` são renderizadores, e renderizador muda
   * entre versões maiores do Postgres. Com majors diferentes e diferenças na saída, não
   * dá para distinguir "o schema divergiu" de "o renderizador mudou" — e chamar isso de
   * MATERIAL DRIFT seria afirmar mais do que se mediu.
   *
   * Zero diferenças com majors diferentes continua sendo EXACT EQUIVALENT, e é uma prova
   * mais forte, não mais fraca: sobreviveu inclusive à troca de renderizador.
   */
  if (
    versaoEsperada !== null &&
    versaoEncontrada !== null &&
    versaoMaior(versaoEsperada) !== versaoMaior(versaoEncontrada)
  ) {
    return {
      ...resultado,
      classificacao: "UNKNOWN",
      motivo: `há ${diferencas.length} diferença(s), mas os dois lados rodam versões maiores diferentes do PostgreSQL (${versaoEsperada} contra ${versaoEncontrada}). As definições vêm de renderizadores do próprio Postgres, que mudam entre versões maiores — então não dá para separar drift de schema de mudança de renderização. Rode o lado efêmero na mesma versão maior e repita.`,
    };
  }

  return {
    ...resultado,
    classificacao: "MATERIAL DRIFT",
    motivo: `${diferencas.length} de ${comparados} objetos divergem. Nenhuma delas é diferença de espaço em branco nem de qualificação de schema — essas já foram normalizadas antes da comparação.`,
  };
}

// ---------------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------------

const SIMBOLO: Record<Classificacao, string> = {
  "EXACT EQUIVALENT": "✅",
  "MATERIAL DRIFT": "❌",
  UNKNOWN: "⚠️",
};

/**
 * Corta uma assinatura longa preservando o começo, que é onde a diferença costuma estar.
 *
 * A CONTRABARRA É ESCAPADA **ANTES** DO PIPE, e a ordem não é estilística.
 *
 * Escapar só o `|` deixava `a\|b` virar `a\\|b` — em Markdown, `\\` é uma contrabarra
 * literal, e o `|` seguinte volta a ser separador de célula. A tabela quebra, e quebra
 * justamente na linha que alguém precisa ler: definição de função em Postgres carrega
 * contrabarra de verdade (`regexp_replace(..., '\s+', ' ')` está no próprio
 * `fingerprint.sql`), então isto não é hipótese.
 *
 * É o mesmo raciocínio do escape do `.pgpass` em `preflight/prepare-credential.sh`:
 * escapar o `:` antes da `\` faria a barra do próprio escape ser escapada em seguida.
 * Lá eu acertei a ordem e escrevi por quê; aqui eu errei, e o CodeQL achou.
 */
function resumir(valor: string | null, limite = 160): string {
  if (valor === null) return "_(ausente)_";
  const limpo = valor.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
  return limpo.length <= limite ? `\`${limpo}\`` : `\`${limpo.slice(0, limite)}…\``;
}

/** Quanto do trecho igual mostrar antes do ponto onde os dois lados se separam. */
const CONTEXTO_ANTES = 24;
/** Tamanho da janela recortada em volta da divergência. */
const JANELA = 140;

/**
 * Recorta duas assinaturas divergentes em volta do ponto onde elas **de fato** divergem.
 *
 * `resumir()` cortava as duas pelos primeiros 160 caracteres, apostando — está escrito
 * ali — que "a diferença costuma estar no começo". A primeira execução real contra
 * staging desmentiu a aposta do pior jeito possível: `pa_normalize_text` só diverge no
 * corpo, depois de um prefixo idêntico de mais de 150 caracteres, e a tabela exibiu duas
 * células com texto EXATAMENTE igual sob o rótulo "assinatura diferente".
 *
 * Um relatório que mostra uma diferença como se fosse igualdade é pior que relatório
 * nenhum. Relatório nenhum deixa a pergunta em aberto; este a respondia errado, e ainda
 * por cima com a autoridade de uma tabela. Quem lesse concluiria que o comparador está
 * com defeito — e pararia de confiar no único instrumento que separa drift real de
 * ruído.
 *
 * Quando não há prefixo comum relevante, o começo já é o lugar certo para olhar e o
 * recorte não acontece: nada é escondido sem motivo.
 */
export function recortarDivergencia(esperado: string, encontrado: string): [string, string] {
  const limite = Math.min(esperado.length, encontrado.length);
  let comum = 0;
  while (comum < limite && esperado[comum] === encontrado[comum]) comum++;

  if (comum <= CONTEXTO_ANTES) return [esperado, encontrado];

  const inicio = comum - CONTEXTO_ANTES;
  return [
    `…${esperado.slice(inicio, inicio + JANELA)}`,
    `…${encontrado.slice(inicio, inicio + JANELA)}`,
  ];
}

export function renderizar(c: Comparacao, grants: GrantClassificado[] = []): string {
  const linhas: string[] = [];

  linhas.push("# Equivalência de schema — staging contra as SETE migrations do baseline");
  linhas.push("");
  linhas.push(`## ${SIMBOLO[c.classificacao]} ${c.classificacao}`);
  linhas.push("");
  linhas.push(c.motivo);
  linhas.push("");
  linhas.push(
    `| | |\n| --- | --- |\n| Objetos comparados | ${c.objetosComparados} |\n| Diferenças | ${c.diferencas.length} |\n| PostgreSQL (efêmero) | ${c.versaoEsperada ?? "?"} |\n| PostgreSQL (staging) | ${c.versaoEncontrada ?? "?"} |`,
  );
  linhas.push("");

  if (c.diferencas.length > 0) {
    linhas.push("## Diferenças, objeto por objeto");
    linhas.push("");
    const porCategoria = new Map<string, Diferenca[]>();
    for (const d of c.diferencas) {
      const lista = porCategoria.get(d.categoria) ?? [];
      lista.push(d);
      porCategoria.set(d.categoria, lista);
    }
    for (const [categoria, lista] of [...porCategoria].sort()) {
      linhas.push(`### \`${categoria}\` — ${lista.length}`);
      linhas.push("");
      linhas.push("| Objeto | Diferença | Esperado (repositório) | Encontrado (staging) |");
      linhas.push("| --- | --- | --- | --- |");
      for (const d of lista) {
        // Só há ponto de divergência quando os dois lados existem. "só no esperado" e
        // "só no ambiente" têm um lado nulo, e aí o recorte não faria sentido nenhum.
        const [esq, dir] =
          d.esperado !== null && d.encontrado !== null
            ? recortarDivergencia(d.esperado, d.encontrado)
            : [d.esperado, d.encontrado];
        // O limite é maior que o de `resumir()` porque o escape de contrabarra pode até
        // dobrar o tamanho do recorte — e truncar de novo devolveria o defeito original.
        const limite = JANELA * 2 + CONTEXTO_ANTES;
        linhas.push(
          `| \`${d.identidade}\` | ${d.tipo} | ${resumir(esq, limite)} | ${resumir(dir, limite)} |`,
        );
      }
      linhas.push("");
    }
  }

  if (grants.length > 0) {
    const porCat = new Map<string, GrantClassificado[]>();
    for (const g of grants) {
      const l = porCat.get(g.categoria) ?? [];
      l.push(g);
      porCat.set(g.categoria, l);
    }
    const inseguros = porCat.get("C. inseguro — exige hardening") ?? [];
    linhas.push("## Grants de tabela em staging, por categoria");
    linhas.push("");
    linhas.push(
      'Isto **não entra no veredito acima**. O lado esperado reproduz os default privileges da plataforma, então esses grants aparecem dos dois lados e não geram diferença — o que é correto para a pergunta "o schema é o das sete migrations?". Modelar para não confundir é uma coisa; modelar para não enxergar seria outra, e é por isso que a classificação vem aqui.',
    );
    linhas.push("");
    for (const [cat, lista] of [...porCat].sort()) {
      linhas.push(`### ${cat} — ${lista.length}`);
      linhas.push("");
      if (cat.startsWith("C.")) {
        linhas.push("| Tabela | Papel | Privilégio | Por quê |");
        linhas.push("| --- | --- | --- | --- |");
        for (const g of lista) {
          linhas.push(`| \`${g.tabela}\` | \`${g.papel}\` | \`${g.privilegio}\` | ${g.porque} |`);
        }
      } else {
        const resumo = new Map<string, string[]>();
        for (const g of lista) {
          const k = `${g.tabela}:${g.papel}`;
          resumo.set(k, [...(resumo.get(k) ?? []), g.privilegio]);
        }
        linhas.push("| Tabela | Papel | Privilégios |");
        linhas.push("| --- | --- | --- |");
        for (const [k, privs] of [...resumo].sort()) {
          const [t, p] = k.split(":");
          linhas.push(`| \`${t}\` | \`${p}\` | ${privs.sort().join(", ")} |`);
        }
      }
      linhas.push("");
    }
    if (inseguros.length > 0) {
      linhas.push(
        `**${inseguros.length} grants na categoria C.** Endereçados por migration própria (\`20260803005000_core_table_privilege_hardening.sql\`), não por esta comparação.`,
      );
      linhas.push("");
    }
  }

  linhas.push("## O que esta classificação autoriza");
  linhas.push("");
  if (c.classificacao === "EXACT EQUIVALENT") {
    linhas.push(
      "Autoriza **adotar** as sete versões do baseline histórico, e só isso. Não autoriza aplicar a normalização, o hardening, R2-A nem R2-B: os demais gates continuam valendo, e cada aplicação é passo próprio, com registro próprio.",
    );
    linhas.push("");
    linhas.push(
      "E vale dizer o que a adoção **não** afirma: que os arquivos versionados foram os comandos originalmente executados neste banco. Essa procedência não existe mais e não é recuperável. O que foi comprovado é que o estado final é semanticamente equivalente ao que esses arquivos produzem a partir do zero.",
    );
  } else if (c.classificacao === "MATERIAL DRIFT") {
    linhas.push(
      "**Não autoriza nada.** Com drift material, `migration repair` carimbaria como aplicadas migrations cujo efeito não é o que está no banco — trocaria uma incerteza conhecida por uma certeza falsa. O caminho é documentar as diferenças e decidir sobre cada uma, não reparar.",
    );
  } else {
    linhas.push(
      "**Não autoriza nada**, e por um motivo diferente de reprovar: a comparação não foi conclusiva. Falhar por fato medido é informação; isto aqui é a ausência dela, e a diferença importa na hora de decidir o próximo passo.",
    );
  }
  linhas.push("");
  linhas.push("---");
  linhas.push("");
  linhas.push(
    "Nada foi escrito em ambiente nenhum para produzir este relatório: os dois lados foram lidos, o de staging em transação `READ ONLY` com `ROLLBACK` ao final. O banco de produção não foi contatado.",
  );

  return linhas.join("\n");
}

if (import.meta.main) {
  const [, , caminhoEsperado, caminhoEncontrado] = process.argv;
  if (caminhoEsperado === undefined || caminhoEncontrado === undefined) {
    console.error("uso: bun compare.ts <fingerprint-efemero.txt> <fingerprint-staging.txt>");
    process.exit(2);
  }
  const c = comparar(
    readFileSync(caminhoEsperado, "utf-8"),
    readFileSync(caminhoEncontrado, "utf-8"),
  );
  console.log(renderizar(c, classificarGrants(readFileSync(caminhoEncontrado, "utf-8"))));
  // Código de saída para o shell: 0 só quando equivalente. O runner usa isto para decidir
  // se o passo seguinte pode nascer.
  process.exit(c.classificacao === "EXACT EQUIVALENT" ? 0 : 1);
}
