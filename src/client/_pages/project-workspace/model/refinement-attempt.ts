export type RefinementAttemptInput = {
  generationId: string;
  prompt: string;
  files: Array<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>;
  canvasState: unknown;
};

export type RefinementAttempt = {
  signature: string;
  idempotencyKey: string;
};

export function refinementAttemptSignature(input: RefinementAttemptInput) {
  return JSON.stringify({
    generationId: input.generationId,
    prompt: input.prompt.trim(),
    files: input.files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    })),
    canvasState: input.canvasState,
  });
}

export class RefinementAttemptRegistry {
  readonly #attempts = new Map<string, string>();
  readonly #maxEntries: number;

  constructor(maxEntries = 8) {
    this.#maxEntries = Math.max(1, Math.trunc(maxEntries));
  }

  get size() {
    return this.#attempts.size;
  }

  begin(
    signature: string,
    createIdempotencyKey: () => string = () => crypto.randomUUID(),
  ): RefinementAttempt {
    const retainedKey = this.#attempts.get(signature);
    if (retainedKey) {
      this.#attempts.delete(signature);
      this.#attempts.set(signature, retainedKey);
      return { signature, idempotencyKey: retainedKey };
    }

    while (this.#attempts.size >= this.#maxEntries) {
      const oldestSignature = this.#attempts.keys().next().value;
      if (oldestSignature === undefined) break;
      this.#attempts.delete(oldestSignature);
    }

    const idempotencyKey = createIdempotencyKey();
    this.#attempts.set(signature, idempotencyKey);
    return { signature, idempotencyKey };
  }

  recordFailure(signature: string, error: unknown) {
    const status =
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : null;
    if (status !== null && status >= 400 && status < 500) {
      this.#attempts.delete(signature);
      return "cleared" as const;
    }
    return "retained" as const;
  }

  recordSuccess(signature: string) {
    this.#attempts.delete(signature);
  }
}
