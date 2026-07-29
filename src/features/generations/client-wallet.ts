import type { QueryClient } from "@tanstack/react-query";
import { GENERATION_CREDIT_COST } from "../../config/product.ts";
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

export type CreditsLifecycleEvent =
  | "reservation"
  | "terminal"
  | "cancellation-refund"
  | "insufficient-error"
  | "poll";

const INSUFFICIENT_CREDITS_MESSAGE =
  "Недостаточно кредитов. Пополните баланс.";

const PURCHASE_LINK = {
  href: "/app/credits",
  label: "Пополнить баланс",
} as const;

const CREDITS_QUERY_KEY = ["credits"] as const;
const TERMINAL_GENERATION_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
]);

export class ApiResponseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiResponseError";
    this.code = code;
  }
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
    wallet !== null &&
    wallet !== undefined &&
    wallet.balance < generationCost;
  const shouldShowPurchaseLink =
    balanceInsufficient || errorCode === "INSUFFICIENT_CREDITS";

  return {
    balanceInsufficient,
    disabledReason: balanceInsufficient
      ? INSUFFICIENT_CREDITS_MESSAGE
      : null,
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
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
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
      error instanceof ApiResponseError &&
      error.code === "INSUFFICIENT_CREDITS"
        ? PURCHASE_LINK
        : null,
  };
}
