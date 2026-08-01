import type { RequiredProvider } from "./reservation-policy.ts";
import { resolveRequiredProvider } from "./reservation-policy.ts";

type ProviderFactory<TInput, TOutput> = (
  provider: RequiredProvider,
  modelId: string,
  timeoutSeconds: number,
) => {
  generate(input: TInput): Promise<TOutput>;
};

export function assertGenerationProviderMode(
  configuredProvider: string | undefined,
  storedProvider: RequiredProvider,
) {
  const requiredProvider = resolveRequiredProvider(configuredProvider);
  if (storedProvider !== requiredProvider) {
    throw new Error("AI_PROVIDER_MODE_MISMATCH");
  }
  return requiredProvider;
}

export async function generateWithConfiguredProvider<TInput, TOutput>(
  input: {
    configuredProvider: string | undefined;
    storedProvider: RequiredProvider;
    modelId: string;
    timeoutSeconds: number;
    input: TInput;
  },
  createProvider: ProviderFactory<TInput, TOutput>,
) {
  const provider = assertGenerationProviderMode(
    input.configuredProvider,
    input.storedProvider,
  );
  return createProvider(provider, input.modelId, input.timeoutSeconds).generate(
    input.input,
  );
}

const CONFIGURATION_ERRORS = new Set([
  "AI_PROVIDER_MODE_MISMATCH",
  "AI_PROVIDER_NOT_SUPPORTED",
  "VERTEX_PROVIDER_NOT_CONFIGURED",
  "VERTEX_CREDENTIALS_NOT_FOUND",
]);

export function classifyGenerationFailure(error: unknown) {
  const isConfigurationError =
    error instanceof Error && CONFIGURATION_ERRORS.has(error.message);
  return isConfigurationError
    ? {
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message:
          "Сервис генерации временно недоступен. Зарезервированные кредиты возвращены на баланс.",
      }
    : {
        code: "AI_GENERATION_FAILED",
        message:
          "Не удалось создать изображение. Зарезервированные кредиты возвращены на баланс.",
      };
}
