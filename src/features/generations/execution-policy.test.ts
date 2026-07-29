import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyGenerationFailure,
  generateWithConfiguredProvider,
} from "./execution-policy.ts";

test("a queued Vertex model cannot reach the provider factory while fake mode is active", async () => {
  let providerFactoryCalls = 0;

  await assert.rejects(
    () =>
      generateWithConfiguredProvider(
        {
          configuredProvider: "fake",
          storedProvider: "VERTEX_AI",
          modelId: "gemini-paid",
          timeoutSeconds: 120,
          input: { prompt: "refine" },
        },
        () => {
          providerFactoryCalls += 1;
          return {
            generate: async () => ({ providerRequestId: "paid-call" }),
          };
        },
      ),
    /AI_PROVIDER_MODE_MISMATCH/,
  );

  assert.equal(providerFactoryCalls, 0);
});

test("worker failure copy confirms that reserved credits were returned", () => {
  assert.deepEqual(
    classifyGenerationFailure(new Error("AI_PROVIDER_MODE_MISMATCH")),
    {
      code: "AI_PROVIDER_NOT_CONFIGURED",
      message:
        "Сервис генерации временно недоступен. Зарезервированные кредиты возвращены на баланс.",
    },
  );
  assert.deepEqual(classifyGenerationFailure(new Error("provider timeout")), {
    code: "AI_GENERATION_FAILED",
    message:
      "Не удалось создать изображение. Зарезервированные кредиты возвращены на баланс.",
  });
});
