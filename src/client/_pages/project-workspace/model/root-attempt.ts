type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Only hashes and keys are persisted; prompts and images never enter this store. */
export class RootAttemptRegistry {
  readonly #keys = new Map<string, string>();
  private readonly storage?: AttemptStorage;
  constructor(storage?: AttemptStorage) {
    this.storage = storage;
  }

  begin(
    scope: string,
    signature: string,
    createKey: () => string = () => crypto.randomUUID(),
  ) {
    const storageKey = `ruvie:root-attempt:v1:${scope}:${signature}`;
    let key = this.#keys.get(storageKey);
    try {
      key ??= this.storage?.getItem(storageKey) ?? undefined;
    } catch {
      /* memory fallback */
    }
    key ??= createKey();
    this.#keys.set(storageKey, key);
    try {
      this.storage?.setItem(storageKey, key);
    } catch {
      /* memory fallback */
    }
    return { storageKey, idempotencyKey: key };
  }

  succeed(attempt: { storageKey: string; idempotencyKey: string }) {
    if (this.#keys.get(attempt.storageKey) !== attempt.idempotencyKey) return;
    this.#keys.delete(attempt.storageKey);
    try {
      if (
        this.storage?.getItem(attempt.storageKey) === attempt.idempotencyKey
      ) {
        this.storage.removeItem(attempt.storageKey);
      }
    } catch {
      /* storage may be unavailable */
    }
  }
}

export async function rootAttemptSignature(input: {
  projectId: string;
  prompt: string;
  aspectRatio: string;
  styleCode?: string;
  canvasState: unknown;
}) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
