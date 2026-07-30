import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { getMarkets, submitPriceUpdate } from "@/services/catalog";
import { formatProductName } from "@/lib/format";
import {
  hasReachedSubmissionLimit,
  MAX_SUBMISSIONS_PER_SESSION,
  recordSubmission,
} from "@/lib/submission-guard";
import type { Product, SubmissionSourceType } from "@/types/domain";

const SOURCE_OPTIONS: Array<{ value: SubmissionSourceType; label: string }> = [
  { value: "receipt", label: "Nota fiscal" },
  { value: "shelf_photo", label: "Foto da etiqueta" },
  { value: "community", label: "Informação da comunidade" },
  { value: "social_media", label: "WhatsApp ou rede social do mercado" },
];

const schema = z.object({
  marketId: z.string().uuid({ message: "Escolha um supermercado da lista." }),
  price: z
    .string()
    .min(1, { message: "Informe o preço encontrado." })
    .refine(
      (value) => {
        const parsed = Number(value.replace(",", "."));
        return Number.isFinite(parsed) && parsed > 0;
      },
      { message: "O preço deve ser maior que zero." },
    ),
  sourceType: z.enum(["receipt", "shelf_photo", "community", "social_media"], {
    required_error: "Escolha a fonte da informação.",
    invalid_type_error: "Escolha a fonte da informação.",
  }),
  comment: z
    .string()
    .max(280, { message: "O comentário deve ter no máximo 280 caracteres." })
    .optional(),
});

type FormValues = z.infer<typeof schema>;

interface SubmitPriceFormProps {
  product: Product;
  defaultMarketId?: string | null;
  onClose: () => void;
}

export function SubmitPriceForm({ product, defaultMarketId, onClose }: SubmitPriceFormProps) {
  const titleId = useId();
  const ids = {
    market: `${titleId}-mercado`,
    price: `${titleId}-preco`,
    source: `${titleId}-fonte`,
    comment: `${titleId}-comentario`,
    website: `${titleId}-website`,
  };
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [limitReached, setLimitReached] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLimitReached(hasReachedSubmissionLimit());
  }, []);

  const marketsQuery = useQuery({
    queryKey: ["markets"],
    queryFn: getMarkets,
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { marketId: defaultMarketId ?? "", price: "", comment: "" },
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    function getFocusable() {
      const container = dialogRef.current;
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]",
        ),
      ).filter((el) => el.tabIndex !== -1);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const productLabel = useMemo(() => formatProductName(product), [product]);

  async function onSubmit(values: FormValues) {
    if (honeypotRef.current?.value) {
      // Provável bot: finge sucesso sem gravar nada.
      reset({ marketId: defaultMarketId ?? "", price: "", comment: "" });
      setStatus("sent");
      return;
    }

    if (hasReachedSubmissionLimit()) {
      setLimitReached(true);
      return;
    }

    setStatus("sending");
    try {
      await submitPriceUpdate({
        productId: product.id,
        marketId: values.marketId,
        submittedPrice: Number(values.price.replace(",", ".")),
        sourceType: values.sourceType,
        comment: values.comment ?? null,
      });
      recordSubmission();
      reset({ marketId: defaultMarketId ?? "", price: "", comment: "" });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl border border-border bg-card p-4 outline-none sm:rounded-2xl"
      >
        <h2 id={titleId} className="text-lg font-bold">
          Informar atualização de preço
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Produto selecionado: <strong className="text-foreground">{productLabel}</strong>
        </p>

        {status === "sent" ? (
          <div className="mt-4 space-y-4" role="status" aria-live="polite">
            <p className="card-base bg-surface">
              Obrigado! A informação será conferida antes de aparecer no comparador.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-base btn-primary" onClick={onClose}>
                Fechar
              </button>
              <button
                type="button"
                className="btn-base btn-secondary"
                onClick={() => setStatus("idle")}
              >
                Informar outro preço
              </button>
            </div>
          </div>
        ) : limitReached ? (
          <div className="mt-4 space-y-4" role="alert">
            <p className="card-base bg-surface">
              Você já enviou {MAX_SUBMISSIONS_PER_SESSION} sugestões nesta sessão. Aguarde um pouco
              e tente novamente mais tarde.
            </p>
            <button type="button" className="btn-base btn-primary" onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div aria-hidden="true" className="sr-only">
              <label htmlFor={ids.website}>Deixe este campo em branco</label>
              <input
                id={ids.website}
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor={ids.market} className="mb-1 block text-sm font-semibold">
                Supermercado
              </label>
              <select
                id={ids.market}
                className="field-base"
                aria-invalid={Boolean(errors.marketId)}
                aria-describedby={errors.marketId ? `${ids.market}-erro` : undefined}
                {...register("marketId")}
              >
                <option value="">Escolha o supermercado</option>
                {(marketsQuery.data ?? []).map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
              {errors.marketId ? (
                <p
                  id={`${ids.market}-erro`}
                  className="mt-1 text-sm font-semibold text-destructive"
                >
                  {errors.marketId.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor={ids.price} className="mb-1 block text-sm font-semibold">
                Preço encontrado (R$)
              </label>
              <input
                id={ids.price}
                type="text"
                inputMode="decimal"
                className="field-base"
                placeholder="Ex.: 12,90"
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? `${ids.price}-erro` : undefined}
                {...register("price")}
              />
              {errors.price ? (
                <p id={`${ids.price}-erro`} className="mt-1 text-sm font-semibold text-destructive">
                  {errors.price.message}
                </p>
              ) : null}
            </div>

            <fieldset aria-describedby={errors.sourceType ? `${ids.source}-erro` : undefined}>
              <legend className="mb-1 text-sm font-semibold">Fonte da informação</legend>
              <div className="space-y-2">
                {SOURCE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      className="size-5"
                      {...register("sourceType")}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.sourceType ? (
                <p
                  id={`${ids.source}-erro`}
                  className="mt-1 text-sm font-semibold text-destructive"
                >
                  {errors.sourceType.message}
                </p>
              ) : null}
            </fieldset>

            <div>
              <label htmlFor={ids.comment} className="mb-1 block text-sm font-semibold">
                Comentário (opcional)
              </label>
              <textarea
                id={ids.comment}
                rows={3}
                maxLength={280}
                className="field-base"
                aria-invalid={Boolean(errors.comment)}
                aria-describedby={errors.comment ? `${ids.comment}-erro` : `${ids.comment}-ajuda`}
                {...register("comment")}
              />
              <p id={`${ids.comment}-ajuda`} className="mt-1 text-sm text-muted-foreground">
                Até 280 caracteres. Não escreva dados pessoais.
              </p>
              {errors.comment ? (
                <p
                  id={`${ids.comment}-erro`}
                  className="mt-1 text-sm font-semibold text-destructive"
                >
                  {errors.comment.message}
                </p>
              ) : null}
            </div>

            {status === "error" ? (
              <p role="alert" className="text-sm font-semibold text-destructive">
                Não estamos aceitando sugestões de preço no momento.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn-base btn-primary"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Enviando…" : "Enviar informação"}
              </button>
              <button type="button" className="btn-base btn-secondary" onClick={onClose}>
                Cancelar
              </button>
            </div>
            <p aria-live="polite" className="sr-only">
              {status === "sending" ? "Enviando informação" : ""}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
