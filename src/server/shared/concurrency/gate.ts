export class CapacityError extends Error {
  constructor() { super("Обработка файлов занята. Повторите попытку через несколько секунд."); }
}

/** Ограниченная очередь, освобождение разрешения безопасно вызывать повторно. */
export class Gate {
  private active = 0;
  private waiting: Array<() => void> = [];
  private readonly limit: number;
  private readonly queueLimit: number;
  constructor(limit: number, queueLimit: number) { this.limit = limit; this.queueLimit = queueLimit; }
  async acquire(): Promise<() => void> {
    if (this.active >= this.limit) {
      if (this.waiting.length >= this.queueLimit) throw new CapacityError();
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    };
  }
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try { return await fn(); } finally { release(); }
  }
}
