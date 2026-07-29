import { GENERATION_CREDIT_COST } from "../../config/product.ts";
import { fullGenerationCount } from "../credits/presentation.ts";

export type GenerationWallet = {
  balance: number;
  generationCost: number;
};

export type GenerationSurface = "root" | "refinement";

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
