import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  ApiResponseError,
  buildRetryGenerationRequest,
  createRetryGenerationAttempt,
  creditsInvalidationQueryKey,
  generationCanvasActionErrorPresentation,
  generationActionErrorPresentation,
  generationWalletPresentation,
  pruneTrackedGenerationIds,
  readApiData,
  reconcileTerminalCredits,
  refreshCreditsAfterLifecycle,
  RetryAttemptRegistry,
} from "./client-wallet.ts";

test("API failures preserve the server error code and message", async () => {
  const response = Response.json(
    {
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "Для генерации нужно 4 кредита",
      },
      meta: { requestId: "request-1" },
    },
    { status: 402 },
  );

  await assert.rejects(readApiData(response), (error: unknown) => {
    assert.ok(error instanceof ApiResponseError);
    assert.equal(error.code, "INSUFFICIENT_CREDITS");
    assert.equal(error.message, "Для генерации нужно 4 кредита");
    return true;
  });
});

test("one client retry attempt generates one idempotency key and reuses it for transport replay", () => {
  let generatedKeys = 0;
  const attempt = createRetryGenerationAttempt(
    { id: "generation-failed", status: "FAILED" },
    () => {
      generatedKeys += 1;
      return "client-attempt-1234567890";
    },
  );

  const first = buildRetryGenerationRequest(attempt);
  const replay = buildRetryGenerationRequest(attempt);
  const firstRequest = new Request(`http://localhost${first.url}`, first.init);
  const replayRequest = new Request(
    `http://localhost${replay.url}`,
    replay.init,
  );

  assert.equal(generatedKeys, 1);
  assert.equal(
    firstRequest.headers.get("idempotency-key"),
    "client-attempt-1234567890",
  );
  assert.equal(
    replayRequest.headers.get("idempotency-key"),
    "client-attempt-1234567890",
  );
  assert.equal(firstRequest.url, replayRequest.url);
});

test("ambiguous retry failures retain one production attempt key for the next submission", () => {
  const attempts = new RetryAttemptRegistry();
  let generatedKeys = 0;
  const generation = { id: "generation-failed", status: "FAILED" };
  const createKey = () => {
    generatedKeys += 1;
    return `client-attempt-${generatedKeys}-1234567890`;
  };

  const first = attempts.begin(generation, createKey);
  assert.equal(
    attempts.recordFailure(generation.id, new TypeError("fetch failed")),
    "retained",
  );
  const replayAfterNetworkFailure = attempts.begin(generation, createKey);
  assert.equal(replayAfterNetworkFailure.idempotencyKey, first.idempotencyKey);

  assert.equal(
    attempts.recordFailure(
      generation.id,
      new ApiResponseError(
        "RETRY_FAILED",
        "Не удалось повторить генерацию",
        500,
      ),
    ),
    "retained",
  );
  assert.equal(
    attempts.recordFailure(
      generation.id,
      new ApiResponseError(
        "UNKNOWN_CONFLICT",
        "Промежуточный сервер не подтвердил результат",
        409,
      ),
    ),
    "retained",
  );
  const replayAfterServerFailure = attempts.begin(generation, createKey);

  assert.equal(replayAfterServerFailure.idempotencyKey, first.idempotencyKey);
  assert.equal(generatedKeys, 1);
  assert.equal(attempts.size, 1);
});

test("authoritative retry outcomes clear the attempt before another user submission", () => {
  const attempts = new RetryAttemptRegistry();
  const generation = { id: "generation-failed", status: "FAILED" };
  let generatedKeys = 0;
  const createKey = () => `client-attempt-${++generatedKeys}-1234567890`;

  for (const [status, code] of [
    [402, "INSUFFICIENT_CREDITS"],
    [404, "GENERATION_NOT_FOUND"],
    [409, "GENERATION_NOT_RETRYABLE"],
  ] as const) {
    const submitted = attempts.begin(generation, createKey);
    assert.equal(
      attempts.recordFailure(
        generation.id,
        new ApiResponseError(code, "Известный ответ", status),
      ),
      "cleared",
    );
    const nextSubmission = attempts.begin(generation, createKey);
    assert.notEqual(nextSubmission.idempotencyKey, submitted.idempotencyKey);
    attempts.recordSuccess(generation.id);
    assert.equal(attempts.size, 0);
  }
});

test("retry attempt state stays bounded when many ambiguous generations fail", () => {
  const attempts = new RetryAttemptRegistry(2);
  let generatedKeys = 0;
  const createKey = () => `client-attempt-${++generatedKeys}-1234567890`;

  const first = attempts.begin(
    { id: "generation-1", status: "FAILED" },
    createKey,
  );
  attempts.begin({ id: "generation-2", status: "FAILED" }, createKey);
  attempts.begin({ id: "generation-3", status: "FAILED" }, createKey);

  assert.equal(attempts.size, 2);
  const firstAfterEviction = attempts.begin(
    { id: "generation-1", status: "FAILED" },
    createKey,
  );
  assert.notEqual(firstAfterEviction.idempotencyKey, first.idempotencyKey);
  assert.equal(attempts.size, 2);
});

test("root generation is disabled with a purchase reason below four credits", () => {
  const presentation = generationWalletPresentation(
    { balance: 3, generationCost: 4 },
    "root",
  );

  assert.equal(presentation.balanceInsufficient, true);
  assert.equal(
    presentation.disabledReason,
    "Недостаточно кредитов. Пополните баланс.",
  );
});

test("refinement is disabled with a purchase reason below four credits", () => {
  const presentation = generationWalletPresentation(
    { balance: 3, generationCost: 4 },
    "refinement",
  );

  assert.equal(presentation.balanceInsufficient, true);
  assert.equal(
    presentation.disabledReason,
    "Недостаточно кредитов. Пополните баланс.",
  );
});

test("zero balance is shown as zero with no available full generations", () => {
  const presentation = generationWalletPresentation(
    { balance: 0, generationCost: 4 },
    "root",
  );

  assert.equal(presentation.balanceText, "Баланс: 0 кредитов");
  assert.equal(
    presentation.availableGenerationsText,
    "Доступно полных генераций: 0",
  );
  assert.equal(presentation.balanceInsufficient, true);
});

test("root and refinement buttons state their exact credit price", () => {
  assert.equal(
    generationWalletPresentation({ balance: 10, generationCost: 4 }, "root")
      .buttonLabel,
    "Создать дизайн · 4 кредита",
  );
  assert.equal(
    generationWalletPresentation(
      { balance: 10, generationCost: 4 },
      "refinement",
    ).buttonLabel,
    "Создать доработку · 4 кредита",
  );
});

test("purchase link follows a low balance or authoritative insufficient-credit error", () => {
  assert.deepEqual(
    generationWalletPresentation({ balance: 3, generationCost: 4 }, "root")
      .purchaseLink,
    { href: "/app/credits", label: "Пополнить баланс" },
  );
  assert.deepEqual(
    generationWalletPresentation(
      { balance: 40, generationCost: 4 },
      "refinement",
      "INSUFFICIENT_CREDITS",
    ).purchaseLink,
    { href: "/app/credits", label: "Пополнить баланс" },
  );
  assert.equal(
    generationWalletPresentation(
      { balance: 40, generationCost: 4 },
      "root",
      "GENERATION_ALREADY_RUNNING",
    ).purchaseLink,
    null,
  );
});

test("credit query invalidation follows reservation, terminal, cancellation-refund, and stale-error lifecycles", () => {
  assert.deepEqual(creditsInvalidationQueryKey("reservation"), ["credits"]);
  assert.deepEqual(creditsInvalidationQueryKey("terminal"), ["credits"]);
  assert.deepEqual(creditsInvalidationQueryKey("cancellation-refund"), [
    "credits",
  ]);
  assert.deepEqual(creditsInvalidationQueryKey("insufficient-error"), [
    "credits",
  ]);
  assert.equal(creditsInvalidationQueryKey("poll"), null);
});

test("a terminal generation first observed in the list reconciles credits exactly once", () => {
  const firstObservation = reconcileTerminalCredits(new Set(), [
    { id: "generation-failed", status: "FAILED" },
    { id: "generation-processing", status: "PROCESSING" },
  ]);

  assert.deepEqual(firstObservation.queryKey, ["credits"]);
  assert.deepEqual(
    [...firstObservation.observedTerminalIds],
    ["generation-failed"],
  );

  const repeatedObservation = reconcileTerminalCredits(
    firstObservation.observedTerminalIds,
    [
      { id: "generation-failed", status: "FAILED" },
      { id: "generation-processing", status: "PROCESSING" },
    ],
  );

  assert.equal(repeatedObservation.queryKey, null);
  assert.deepEqual(
    [...repeatedObservation.observedTerminalIds],
    ["generation-failed"],
  );
});

test("list reconciliation deduplicates a terminal generation already observed by point polling or cancellation", () => {
  const reconciliation = reconcileTerminalCredits(
    new Set(["generation-cancelled"]),
    [{ id: "generation-cancelled", status: "CANCELLED" }],
  );

  assert.equal(reconciliation.queryKey, null);
  assert.deepEqual(
    [...reconciliation.observedTerminalIds],
    ["generation-cancelled"],
  );
});

test("terminal reconciliation cancels an in-flight stale wallet read before refetching", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let requestNumber = 0;
  let markFirstRequestStarted: (() => void) | undefined;
  const firstRequestStarted = new Promise<void>((resolve) => {
    markFirstRequestStarted = resolve;
  });
  const observer = new QueryObserver(queryClient, {
    queryKey: ["credits"],
    queryFn: ({ signal }) => {
      requestNumber += 1;
      if (requestNumber > 1) {
        return Promise.resolve({ balance: 10, generationCost: 4 });
      }
      markFirstRequestStarted?.();
      return new Promise<{ balance: number; generationCost: number }>(
        (_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        },
      );
    },
  });
  const unsubscribe = observer.subscribe(() => undefined);

  await firstRequestStarted;
  await refreshCreditsAfterLifecycle(queryClient, "terminal");

  assert.deepEqual(queryClient.getQueryData(["credits"]), {
    balance: 10,
    generationCost: 4,
  });
  unsubscribe();
});

test("retry and variation 402 errors preserve visible purchase destinations", () => {
  const serverError = new ApiResponseError(
    "INSUFFICIENT_CREDITS",
    "Для генерации нужно 4 кредита",
  );

  assert.deepEqual(generationActionErrorPresentation(serverError, "retry"), {
    message: "Для генерации нужно 4 кредита",
    purchaseLink: {
      href: "/app/credits",
      label: "Пополнить баланс",
    },
  });
  assert.deepEqual(
    generationActionErrorPresentation(serverError, "variation"),
    {
      message: "Для генерации нужно 4 кредита",
      purchaseLink: {
        href: "/app/credits",
        label: "Пополнить баланс",
      },
    },
  );
});

test("ordinary retry and variation errors do not offer a purchase destination", () => {
  assert.deepEqual(
    generationActionErrorPresentation(new Error("Повтор не удался"), "retry"),
    {
      message: "Повтор не удался",
      purchaseLink: null,
    },
  );
  assert.deepEqual(
    generationActionErrorPresentation("unexpected", "variation"),
    {
      message: "Не удалось создать ещё один вариант",
      purchaseLink: null,
    },
  );
});

test("a retry 402 wins over an older cancellation error on a failed generation", () => {
  const presentation = generationCanvasActionErrorPresentation({
    generationId: "generation-1",
    status: "FAILED",
    cancellationFailure: {
      generationId: "generation-1",
      error: new Error("Генерацию уже нельзя отменить"),
    },
    retryFailure: {
      generationId: "generation-1",
      error: new ApiResponseError(
        "INSUFFICIENT_CREDITS",
        "Для генерации нужно 4 кредита",
      ),
    },
  });

  assert.deepEqual(presentation, {
    message: "Для генерации нужно 4 кредита",
    purchaseLink: {
      href: "/app/credits",
      label: "Пополнить баланс",
    },
  });
});

test("a queued generation keeps its matching cancellation error", () => {
  const presentation = generationCanvasActionErrorPresentation({
    generationId: "generation-1",
    status: "QUEUED",
    cancellationFailure: {
      generationId: "generation-1",
      error: new Error("Генерацию уже нельзя отменить"),
    },
    retryFailure: {
      generationId: "generation-1",
      error: new Error("Старая ошибка повтора"),
    },
  });

  assert.deepEqual(presentation, {
    message: "Генерацию уже нельзя отменить",
    purchaseLink: null,
  });
});

test("terminal tracking cleanup removes completed observers and retains active ones", () => {
  assert.deepEqual(
    pruneTrackedGenerationIds(
      ["generation-active", "generation-terminal", "generation-new"],
      ["generation-terminal"],
    ),
    ["generation-active", "generation-new"],
  );
});
