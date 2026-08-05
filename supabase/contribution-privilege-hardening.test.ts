// R2.6 — regressão estática do hardening de privilégio das tabelas de contribuição.
//
// O drill (`scripts/db-drill/`) prova o EFEITO contra um Postgres vivo: os privilégios somem,
// o rollback devolve, a reaplicação tira de novo. Este arquivo prova outra coisa, que o drill
// não alcança: que o TEXTO da migration continua sendo o que dizemos que ele é.
//
// São perguntas diferentes e as duas importam. Um `GRANT` acrescentado por engano a esta
// migration passaria no drill se, por acaso, outra coisa o anulasse depois — e não passaria
// aqui.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const ARQUIVO = "20260803007500_contribution_table_privilege_hardening.sql";

const TABELAS = ["price_submissions", "product_watch_requests", "decision_feedback"] as const;

const sql = readFileSync(join(MIGRATIONS_DIR, ARQUIVO), "utf-8");

/**
 * O SQL executável, sem os comentários — inclusive sem o bloco de ROLLBACK, que vive em
 * comentário e contém `GRANT` de propósito. Sem esta separação, "a migration não concede
 * privilégio nenhum" reprovaria por causa do próprio rollback documentado.
 */
const executavel = sql
  .split("\n")
  .filter((linha) => !linha.trimStart().startsWith("--"))
  .join("\n");

/** Reproduz exatamente o que `scripts/db-drill/95-rollback-reapply.sh` extrai. */
function extrairRollback(fonte: string): string {
  const inicio = fonte.indexOf("-- ROLLBACK-SQL-BEGIN");
  const fim = fonte.indexOf("-- ROLLBACK-SQL-END");
  if (inicio === -1 || fim === -1 || fim < inicio) return "";
  return fonte
    .slice(inicio, fim)
    .split("\n")
    .slice(1)
    .map((linha) => linha.replace(/^-- {0,3}/, ""))
    .join("\n")
    .trim();
}

const rollback = extrairRollback(sql);

describe("20260803007500 — ordem das migrations de R2", () => {
  it("o hardening de contribuição fica entre o hardening central e R2-A", () => {
    // A ordem não é estética. R2-A cria um índice funcional sobre `pa_normalize_text()`, que a
    // migration de normalização redefine — aplicar R2-A antes assaria a normalização errada no
    // índice de identidade. Os dois hardenings entram entre uma coisa e outra, e o timestamp é
    // o único mecanismo que garante isso.
    const esperada = [
      "20260803000000_normalization_contract.sql",
      "20260803005000_core_table_privilege_hardening.sql",
      "20260803007500_contribution_table_privilege_hardening.sql",
      "20260803010000_product_identity_quantity.sql",
      "20260803020000_gtin_integrity.sql",
    ];
    const encontradas = readdirSync(MIGRATIONS_DIR)
      .filter((nome) => nome.endsWith(".sql") && nome.startsWith("202608"))
      .sort();

    expect(encontradas).toEqual(esperada);
  });
});

describe("20260803007500 — o que a migration faz", () => {
  for (const tabela of TABELAS) {
    it(`revoga tudo de anon e authenticated em ${tabela}`, () => {
      expect(executavel).toMatch(
        new RegExp(`REVOKE ALL PRIVILEGES ON public\\.${tabela}\\s+FROM anon, authenticated;`),
      );
    });

    it(`revoga tudo de PUBLIC em ${tabela}`, () => {
      // PUBLIC é papel implícito do qual todo mundo herda. Revogar só de anon/authenticated
      // não desfaz o que estiver em PUBLIC — foi a lição do achado crítico da Onda 3 nas
      // funções, e ela vale simétrica aqui.
      expect(executavel).toMatch(
        new RegExp(`REVOKE ALL PRIVILEGES ON public\\.${tabela}\\s+FROM PUBLIC;`),
      );
    });
  }

  it("corta a herança de tabela futura medindo o papel, em vez de presumi-lo", () => {
    // `ALTER DEFAULT PRIVILEGES` sem `FOR ROLE` aplica ao papel da SESSÃO: se quem criou as
    // tabelas for outro, o comando roda, devolve sucesso e não desfaz nada. Gate verde sobre
    // banco inalterado é o pior resultado possível, e é por isso que `FOR ROLE %I` alimentado
    // por `pg_default_acl` é obrigatório aqui.
    expect(executavel).toContain("pg_default_acl");
    expect(executavel).toMatch(/ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public/);
    expect(executavel).toMatch(/REVOKE ALL ON TABLES FROM anon, authenticated/);
    expect(executavel).toMatch(/REVOKE ALL ON TABLES FROM PUBLIC/);
  });

  it("se autoverifica: aborta se algum privilégio público sobreviver", () => {
    // `REVOKE` não falha quando não há o que revogar, nem quando revoga do papel errado. Sem
    // este bloco, a migration não teria como distinguir "removeu" de "não fez nada".
    expect(executavel).toContain("has_table_privilege");
    expect(executavel).toMatch(/RAISE EXCEPTION/);
    expect(executavel).toMatch(/sobreviveram/);
  });

  it("tem controle negativo: falha se service_role tiver sido atingido", () => {
    expect(executavel).toMatch(/has_table_privilege\('service_role'/);
    expect(executavel).toMatch(/alem do escopo/);
  });
});

describe("20260803007500 — o que a migration não pode fazer", () => {
  it("não concede privilégio nenhum", () => {
    // A palavra `GRANT` passou a aparecer no texto do `RAISE WARNING` que R2.6 acrescentou
    // ("GRANT da plataforma"), e uma mensagem não concede nada. O que não pode existir é um
    // GRANT como STATEMENT — nem solto, nem dentro do `format()` de um `EXECUTE`.
    expect(executavel, "há um GRANT como statement").not.toMatch(/(^|;)\s*GRANT\b/im);
    expect(executavel, "há um GRANT dentro de um EXECUTE").not.toMatch(
      /EXECUTE\s+format\(\s*\n?\s*'[^']*\bGRANT\b/i,
    );
  });

  it("não toca em RLS nem em policy", () => {
    for (const proibido of [
      /CREATE\s+POLICY/i,
      /ALTER\s+POLICY/i,
      /DROP\s+POLICY/i,
      /ROW\s+LEVEL\s+SECURITY/i,
    ]) {
      expect(executavel, `a migration contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("não altera dado", () => {
    for (const proibido of [/\bINSERT\s+INTO\b/i, /\bUPDATE\s+public\./i, /\bDELETE\s+FROM\b/i]) {
      expect(executavel, `a migration contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("não é destrutiva de schema", () => {
    for (const proibido of [/DROP\s+TABLE/i, /DROP\s+COLUMN/i, /ALTER\s+TABLE/i]) {
      expect(executavel, `a migration contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("não menciona as três tabelas centrais — elas são escopo de 20260803005000", () => {
    for (const central of ["markets", "products", "prices"]) {
      expect(executavel, `a migration toca em ${central}`).not.toMatch(
        new RegExp(`public\\.${central}\\b`),
      );
    }
  });
});

describe("20260803007500 — bloco de rollback extraível", () => {
  it("tem os dois marcadores, na ordem certa, com conteúdo entre eles", () => {
    expect(sql).toContain("-- ROLLBACK-SQL-BEGIN");
    expect(sql).toContain("-- ROLLBACK-SQL-END");
    expect(sql.indexOf("-- ROLLBACK-SQL-BEGIN")).toBeLessThan(sql.indexOf("-- ROLLBACK-SQL-END"));
    expect(rollback.length).toBeGreaterThan(0);
  });

  it("o bloco extraído é SQL, não comentário", () => {
    for (const linha of rollback.split("\n")) {
      expect(linha, `sobrou prefixo de comentário: ${linha}`).not.toMatch(/^--/);
    }
    expect(rollback).toMatch(/^GRANT\b/);
  });

  it("devolve os privilégios nas três tabelas", () => {
    for (const tabela of TABELAS) {
      expect(rollback).toContain(`public.${tabela}`);
    }
  });

  it("NÃO devolve INSERT — isso reverteria a Onda 3, que tem gate próprio", () => {
    // Reabrir submissão pública exige endpoint server-side, validação, proteção anti-abuso e
    // decisão do Founder/PMO (20260729223000). Um rollback que devolvesse INSERT faria isso
    // de carona, sem gate nenhum.
    expect(rollback).not.toMatch(/\bINSERT\b/i);
  });

  it("só devolve privilégio — não cria, não apaga, não escreve em linha", () => {
    // `DELETE` e `TRUNCATE` aparecem no rollback e devem aparecer: são NOMES DE PRIVILÉGIO
    // sendo devolvidos, não comandos. O que não pode existir é a forma executável deles —
    // `DELETE FROM`, `TRUNCATE TABLE`, `DROP`. A primeira versão deste teste casava a palavra
    // solta e reprovava um rollback correto, que é o modo de falha mais caro que um teste
    // tem: ele empurra quem lê a corrigir o código certo.
    for (const proibido of [
      /\bDROP\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bTRUNCATE\s+TABLE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+public\./i,
    ]) {
      expect(rollback, `o rollback contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("o default privilege do rollback não devolve os quatro de escrita", () => {
    // Eles foram cortados por 20260803005000, que continua aplicada. Reverter esta migration
    // não pode desfazer a anterior.
    const alterDefault = /ALTER DEFAULT PRIVILEGES[\s\S]*?GRANT ([^']+) ON TABLES/.exec(rollback);
    expect(alterDefault).not.toBeNull();
    const concedidos = alterDefault![1];
    for (const escrita of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
      expect(concedidos, `o rollback devolve ${escrita} ao default privilege`).not.toContain(
        escrita,
      );
    }
  });
});
