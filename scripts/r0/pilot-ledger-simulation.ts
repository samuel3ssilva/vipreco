// Preparação do Gate R0 — simulação de dedup fiscal, idempotência, retenção e exclusão
// com dados exclusivamente sintéticos. Não é o ledger real: o schema de NFC-e/cashback
// ainda não existe (ver docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md, que propõe a arquitetura
// que este módulo prova em miniatura). Prova, com funções puras testáveis, os invariantes
// que CLAUDE.md §9 exige antes de qualquer dado real: nunca reter a chave fiscal bruta além
// da consulta/validação (aqui, o ledger nunca guarda a chave bruta — só o HMAC), nunca pagar
// o mesmo cupom duas vezes, e nunca vazar identificador bruto em log.
import { createHmac } from "node:crypto";

export function hmacFiscalKey(rawKey: string, secret: string): string {
  return createHmac("sha256", secret).update(rawKey).digest("hex");
}

export type CouponStatus = "paid" | "already_paid" | "duplicate" | "expired" | "invalid";

export interface CouponSubmission {
  submissionId: string;
  rawFiscalKey: string;
  amountCents: number;
  collectedAt: Date;
}

export interface LedgerEntry {
  submissionId: string;
  fiscalKeyHmac: string;
  amountCents: number;
  collectedAt: Date;
  paidAt: Date;
}

export interface ProcessResult {
  status: CouponStatus;
  entries: LedgerEntry[];
}

// Janela operacional proposta em docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md: cupom coletado
// fora dessa janela é rejeitado, nunca processado tardiamente sem revisão manual.
const MAX_SUBMISSION_WINDOW_DAYS = 30;

function ageInDays(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

export function processCouponIdempotent(
  ledger: LedgerEntry[],
  submission: CouponSubmission,
  secret: string,
  now: Date,
): ProcessResult {
  if (submission.amountCents < 1) {
    return { status: "invalid", entries: ledger };
  }

  const age = ageInDays(submission.collectedAt, now);
  if (age < 0 || age > MAX_SUBMISSION_WINDOW_DAYS) {
    return { status: "expired", entries: ledger };
  }

  if (ledger.some((entry) => entry.submissionId === submission.submissionId)) {
    return { status: "already_paid", entries: ledger };
  }

  const fiscalKeyHmac = hmacFiscalKey(submission.rawFiscalKey, secret);
  if (ledger.some((entry) => entry.fiscalKeyHmac === fiscalKeyHmac)) {
    return { status: "duplicate", entries: ledger };
  }

  const entry: LedgerEntry = {
    submissionId: submission.submissionId,
    fiscalKeyHmac,
    amountCents: submission.amountCents,
    collectedAt: submission.collectedAt,
    paidAt: now,
  };
  return { status: "paid", entries: [...ledger, entry] };
}

export function isWithinRetention(collectedAt: Date, now: Date, retentionDays: number): boolean {
  return ageInDays(collectedAt, now) <= retentionDays;
}

// Simula a exclusão ao fim da retenção: remove por completo a entrada do ledger. Como
// LedgerEntry nunca guarda a chave fiscal bruta (só o HMAC), a exclusão aqui é total —
// não há dado bruto residual a redigir depois de expirado.
export function purgeExpired(
  ledger: LedgerEntry[],
  now: Date,
  retentionDays: number,
): LedgerEntry[] {
  return ledger.filter((entry) => isWithinRetention(entry.collectedAt, now, retentionDays));
}

// O que um caminho de log real deveria registrar para uma submissão recebida — nunca a
// chave fiscal bruta, só o identificador protegido por HMAC (CLAUDE.md §9, "não registrar
// chave em logs, analytics ou mensagens de erro").
export function describeSubmissionForLog(
  submission: CouponSubmission,
  secret: string,
): Record<string, unknown> {
  return {
    submissionId: submission.submissionId,
    fiscalKeyHmac: hmacFiscalKey(submission.rawFiscalKey, secret),
    amountCents: submission.amountCents,
    collectedAt: submission.collectedAt.toISOString(),
  };
}
