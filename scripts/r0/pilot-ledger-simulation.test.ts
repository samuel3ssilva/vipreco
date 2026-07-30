import { describe, expect, it } from "vitest";
import {
  describeSubmissionForLog,
  hmacFiscalKey,
  isWithinRetention,
  processCouponIdempotent,
  purgeExpired,
  type CouponSubmission,
  type LedgerEntry,
} from "./pilot-ledger-simulation.ts";

const SECRET = "segredo-sintetico-de-teste";
const NOW = new Date("2026-08-01T12:00:00Z");

function synthSubmission(overrides: Partial<CouponSubmission> = {}): CouponSubmission {
  return {
    submissionId: "sub-001",
    rawFiscalKey: "35260712345678000199650010000012341000012349",
    amountCents: 500,
    collectedAt: new Date("2026-07-30T12:00:00Z"),
    ...overrides,
  };
}

describe("hmacFiscalKey", () => {
  it("é determinístico para a mesma chave e segredo", () => {
    const a = hmacFiscalKey("chave-sintetica-1", SECRET);
    const b = hmacFiscalKey("chave-sintetica-1", SECRET);
    expect(a).toBe(b);
  });

  it("nunca é igual à chave bruta de entrada", () => {
    const rawKey = "chave-sintetica-1";
    expect(hmacFiscalKey(rawKey, SECRET)).not.toBe(rawKey);
  });

  it("produz saídas diferentes para chaves diferentes", () => {
    expect(hmacFiscalKey("chave-a", SECRET)).not.toBe(hmacFiscalKey("chave-b", SECRET));
  });
});

describe("processCouponIdempotent", () => {
  it("paga um cupom sintético válido e novo", () => {
    const result = processCouponIdempotent([], synthSubmission(), SECRET, NOW);
    expect(result.status).toBe("paid");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].fiscalKeyHmac).not.toBe(synthSubmission().rawFiscalKey);
  });

  it("é idempotente: reenviar o mesmo submissionId não paga duas vezes", () => {
    const first = processCouponIdempotent([], synthSubmission(), SECRET, NOW);
    const second = processCouponIdempotent(first.entries, synthSubmission(), SECRET, NOW);
    expect(second.status).toBe("already_paid");
    expect(second.entries).toHaveLength(1);
  });

  it("rejeita chave fiscal duplicada sob um submissionId diferente", () => {
    const first = processCouponIdempotent([], synthSubmission(), SECRET, NOW);
    const duplicateKey = processCouponIdempotent(
      first.entries,
      synthSubmission({ submissionId: "sub-002" }),
      SECRET,
      NOW,
    );
    expect(duplicateKey.status).toBe("duplicate");
    expect(duplicateKey.entries).toHaveLength(1);
  });

  it("rejeita valor inválido (<= 0) sem gravar entrada", () => {
    const result = processCouponIdempotent([], synthSubmission({ amountCents: 0 }), SECRET, NOW);
    expect(result.status).toBe("invalid");
    expect(result.entries).toHaveLength(0);
  });

  it("rejeita cupom coletado fora da janela operacional (expirado)", () => {
    const stale = synthSubmission({ collectedAt: new Date("2026-01-01T00:00:00Z") });
    const result = processCouponIdempotent([], stale, SECRET, NOW);
    expect(result.status).toBe("expired");
    expect(result.entries).toHaveLength(0);
  });

  it("rejeita cupom com data de coleta no futuro em relação a 'now' (relógio inconsistente)", () => {
    const future = synthSubmission({ collectedAt: new Date("2026-12-01T00:00:00Z") });
    const result = processCouponIdempotent([], future, SECRET, NOW);
    expect(result.status).toBe("expired");
  });

  it("dois cupons sintéticos distintos e válidos são ambos pagos", () => {
    const first = processCouponIdempotent(
      [],
      synthSubmission({ submissionId: "sub-a" }),
      SECRET,
      NOW,
    );
    const second = processCouponIdempotent(
      first.entries,
      synthSubmission({ submissionId: "sub-b", rawFiscalKey: "outra-chave-sintetica" }),
      SECRET,
      NOW,
    );
    expect(second.status).toBe("paid");
    expect(second.entries).toHaveLength(2);
  });
});

describe("isWithinRetention / purgeExpired", () => {
  const RETENTION_DAYS = 7;

  it("está dentro da retenção exatamente no limite do prazo", () => {
    const collectedAt = new Date(NOW.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    expect(isWithinRetention(collectedAt, NOW, RETENTION_DAYS)).toBe(true);
  });

  it("está fora da retenção um instante após o limite do prazo", () => {
    const collectedAt = new Date(NOW.getTime() - (RETENTION_DAYS * 24 * 60 * 60 * 1000 + 1000));
    expect(isWithinRetention(collectedAt, NOW, RETENTION_DAYS)).toBe(false);
  });

  it("purgeExpired remove do ledger somente as entradas além da retenção", () => {
    const ledger: LedgerEntry[] = [
      {
        submissionId: "dentro-do-prazo",
        fiscalKeyHmac: hmacFiscalKey("chave-1", SECRET),
        amountCents: 500,
        collectedAt: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000),
        paidAt: NOW,
      },
      {
        submissionId: "fora-do-prazo",
        fiscalKeyHmac: hmacFiscalKey("chave-2", SECRET),
        amountCents: 500,
        collectedAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
        paidAt: NOW,
      },
    ];
    const purged = purgeExpired(ledger, NOW, RETENTION_DAYS);
    expect(purged.map((e) => e.submissionId)).toEqual(["dentro-do-prazo"]);
  });
});

describe("describeSubmissionForLog", () => {
  it("nunca inclui a chave fiscal bruta na saída destinada a log", () => {
    const submission = synthSubmission();
    const logged = describeSubmissionForLog(submission, SECRET);
    const serialized = JSON.stringify(logged);
    expect(serialized).not.toContain(submission.rawFiscalKey);
    expect(logged).not.toHaveProperty("rawFiscalKey");
  });

  it("inclui o identificador protegido por HMAC, não a chave bruta", () => {
    const submission = synthSubmission();
    const logged = describeSubmissionForLog(submission, SECRET);
    expect(logged.fiscalKeyHmac).toBe(hmacFiscalKey(submission.rawFiscalKey, SECRET));
  });
});
