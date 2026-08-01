import type { QueryClient } from "@tanstack/react-query";
import { GENERATION_CREDIT_COST } from "../../config/product.ts";
import { CREDITS_QUERY_KEY, refreshCreditsQuery } from "../credits/client.ts";
import { fullGenerationCount } from "../credits/presentation.ts";

export type GenerationWallet = {
  balance: number;
  generationCost: number;
};

export type GenerationSurface = "root" | "refinement";
export type GenerationActionSurface = "retry" | "variation";

export type GenerationActionErrorPresentation = {
  message: string;
  purchaseLink: typeof PURCHASE_LINK | null;
};

export type GenerationMutationFailure = {
  generationId: string;
  error: unknown;
};

export type CreditsLifecycleEvent =
  | "reservation"
  | "terminal"
  | "cancellation-refund"
  | "insufficient-error"
  | "poll";

const INSUFFICIENT_CREDITS_MESSAGE = "Недостаточно кредитов. Пополните баланс.";

const PURCHASE_LINK = {
  href: "/app/credits",
  label: "Пополнить баланс",
} as const;

const TERMINAL_GENERATION_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
]);

export class ApiResponseError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null = null) {
    super(message);
    this.name = "ApiResponseError";
    this.code = code;
    this.status = status;
  }
}

export type RetryGenerationAttempt<
  TGeneration extends { id: string; status: string },
> = {
  generation: TGeneration;
  idempotencyKey: string;
};

export function createRetryGenerationAttempt<
  TGeneration extends { id: string; status: string },
>(
  generation: TGeneration,
  createIdempotencyKey: () => string = () => crypto.randomUUID(),
): RetryGenerationAttempt<TGeneration> {
  return {
    generation,
    idempotencyKey: createIdempotencyKey(),
  };
}

const DEFAULT_MAX_RETAINED_RETRY_ATTEMPTS = 32;
const AUTHORITATIVE_RETRY_FAILURE_CODES = new Set([
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "VALIDATION_ERROR",
  "GENERATION_NOT_FOUND",
  "GENERATION_NOT_RETRYABLE",
  "USER_BLOCKED",
  "PROFILE_NOT_FOUND",
  "PROJECT_NOT_READY",
  "MODEL_NOT_FOUND",
  "MODEL_NOT_ALLOWED",
  "GENERATION_ALREADY_RUNNING",
  "GENERATION_LIMIT_EXCEEDED",
  "INSUFFICIENT_CREDITS",
]);

export class RetryAttemptRegistry {
  readonly #attempts = new Map<string, string>();
  readonly #maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_RETAINED_RETRY_ATTEMPTS) {
    this.#maxEntries = Math.max(1, Math.trunc(maxEntries));
  }

  get size() {
    return this.#attempts.size;
  }

  begin<TGeneration extends { id: string; status: string }>(
    generation: TGeneration,
    createIdempotencyKey: () => string = () => crypto.randomUUID(),
  ): RetryGenerationAttempt<TGeneration> {
    const retainedKey = this.#attempts.get(generation.id);
    if (retainedKey) {
      this.#attempts.delete(generation.id);
      this.#attempts.set(generation.id, retainedKey);
      return {
        generation,
        idempotencyKey: retainedKey,
      };
    }

    while (this.#attempts.size >= this.#maxEntries) {
      const oldestGenerationId = this.#attempts.keys().next().value;
      if (oldestGenerationId === undefined) break;
      this.#attempts.delete(oldestGenerationId);
    }

    const idempotencyKey = createIdempotencyKey();
    this.#attempts.set(generation.id, idempotencyKey);
    return {
      generation,
      idempotencyKey,
    };
  }

  recordFailure(generationId: string, error: unknown) {
    if (
      error instanceof ApiResponseError &&
      error.status !== null &&
      error.status >= 400 &&
      error.status < 500 &&
      AUTHORITATIVE_RETRY_FAILURE_CODES.has(error.code)
    ) {
      this.#attempts.delete(generationId);
      return "cleared" as const;
    }
    return "retained" as const;
  }

  recordSuccess(generationId: string) {
    this.#attempts.delete(generationId);
  }
}

export function buildRetryGenerationRequest(
  attempt: RetryGenerationAttempt<{ id: string; status: string }>,
) {
  return {
    url: `/api/v1/generations/${attempt.generation.id}/retry`,
    init: {
      method: "POST",
      headers: {
        "idempotency-key": attempt.idempotencyKey,
      },
    } satisfies RequestInit,
  };
}

export async function readApiData<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as {
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    throw new ApiResponseError(
      payload.error?.code ?? "REQUEST_FAILED",
      payload.error?.message ?? "Запрос не выполнен",
      response.status,
    );
  }
  return payload.data as T;
}

export function generationWalletPresentation(
  wallet: GenerationWallet | null | undefined,
  surface: GenerationSurface,
  errorCode?: string | null,
) {
  const generationCost = wallet?.generationCost ?? GENERATION_CREDIT_COST;
  const balanceInsufficient =
    wallet !== null && wallet !== undefined && wallet.balance < generationCost;
  const shouldShowPurchaseLink =
    balanceInsufficient || errorCode === "INSUFFICIENT_CREDITS";

  return {
    balanceInsufficient,
    disabledReason: balanceInsufficient ? INSUFFICIENT_CREDITS_MESSAGE : null,
    balanceText:
      wallet === null || wallet === undefined
        ? "Баланс недоступен"
        : `Баланс: ${wallet.balance} кредитов`,
    availableGenerationsText:
      wallet === null || wallet === undefined
        ? null
        : `Доступно полных генераций: ${fullGenerationCount(
            wallet.balance,
            generationCost,
          )}`,
    buttonLabel:
      surface === "root"
        ? `Создать дизайн · ${generationCost} кредита`
        : `Создать доработку · ${generationCost} кредита`,
    purchaseLink: shouldShowPurchaseLink ? PURCHASE_LINK : null,
  };
}

export function creditsInvalidationQueryKey(event: CreditsLifecycleEvent) {
  return event === "poll" ? null : CREDITS_QUERY_KEY;
}

export async function refreshCreditsAfterLifecycle(
  queryClient: QueryClient,
  event: CreditsLifecycleEvent,
) {
  const queryKey = creditsInvalidationQueryKey(event);
  if (!queryKey) return;
  await refreshCreditsQuery(queryClient);
}

export function reconcileTerminalCredits(
  observedTerminalIds: ReadonlySet<string>,
  generations: ReadonlyArray<{ id: string; status: string }>,
) {
  const nextObservedTerminalIds = new Set(observedTerminalIds);
  let foundNewTerminal = false;

  for (const generation of generations) {
    if (
      !TERMINAL_GENERATION_STATUSES.has(generation.status) ||
      nextObservedTerminalIds.has(generation.id)
    ) {
      continue;
    }
    nextObservedTerminalIds.add(generation.id);
    foundNewTerminal = true;
  }

  return {
    observedTerminalIds: nextObservedTerminalIds,
    queryKey: foundNewTerminal ? CREDITS_QUERY_KEY : null,
  };
}

export function generationActionErrorPresentation(
  error: unknown,
  surface: GenerationActionSurface,
): GenerationActionErrorPresentation {
  const fallbackMessage =
    surface === "retry"
      ? "Не удалось повторить генерацию"
      : "Не удалось создать ещё один вариант";

  return {
    message: error instanceof Error ? error.message : fallbackMessage,
    purchaseLink:
      error instanceof ApiResponseError && error.code === "INSUFFICIENT_CREDITS"
        ? PURCHASE_LINK
        : null,
  };
}

export function generationCanvasActionErrorPresentation(input: {
  generationId: string;
  status: string;
  cancellationFailure?: GenerationMutationFailure | null;
  retryFailure?: GenerationMutationFailure | null;
}) {
  const cancellationError =
    input.cancellationFailure?.generationId === input.generationId
      ? input.cancellationFailure.error
      : null;
  const retryError =
    input.retryFailure?.generationId === input.generationId
      ? input.retryFailure.error
      : null;
  const retryIsVisible =
    input.status === "FAILED" || input.status === "REJECTED";
  const actionError = retryIsVisible
    ? (retryError ?? cancellationError)
    : (cancellationError ?? retryError);

  return actionError
    ? generationActionErrorPresentation(actionError, "retry")
    : null;
}

export function pruneTrackedGenerationIds(
  trackedGenerationIds: string[],
  terminalGenerationIds: ReadonlyArray<string>,
) {
  const terminalIds = new Set(terminalGenerationIds);
  if (!trackedGenerationIds.some((id) => terminalIds.has(id))) {
    return trackedGenerationIds;
  }
  return trackedGenerationIds.filter((id) => !terminalIds.has(id));
}
