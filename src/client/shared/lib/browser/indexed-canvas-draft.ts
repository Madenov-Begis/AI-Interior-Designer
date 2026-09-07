import { CanvasDraftStore, CANVAS_DRAFT_PREFIX } from "./canvas-draft";
import type { ProjectWorkspaceCanvasStateDto as CanvasState } from "../../api/projects/project-workspace";

let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ruvie-canvas-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Draft database is blocked"));
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

async function updateRecord(
  key: string,
  update: (raw: string | null) => string | null,
) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    const store = tx.objectStore("drafts");
    const request = store.get(key);
    request.onsuccess = () => {
      try {
        const raw = update(
          typeof request.result === "string" ? request.result : null,
        );
        if (raw === null) store.delete(key);
        else store.put(raw, key);
      } catch {
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(tx.error ?? new Error("Draft write failed"));
  });
}

export class IndexedCanvasDraftStore {
  private readonly legacy: CanvasDraftStore;
  private readonly userId: string;
  private readonly projectId: string;
  constructor(userId: string, projectId: string) {
    this.userId = userId;
    this.projectId = projectId;
    this.legacy = new CanvasDraftStore(
      {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
      },
      userId,
      projectId,
    );
  }
  async save(state: CanvasState, base: CanvasState | null) {
    const updatedAt = Date.now();
    // A synchronous fallback protects navigation immediately after a stroke.
    let fallbackSaved = false;
    try {
      this.legacy.save(state, base, updatedAt);
      fallbackSaved = true;
    } catch {
      // Do not prefer an older fallback after a quota failure.
      try {
        localStorage.removeItem(this.legacy.key);
      } catch {
        /* storage disabled */
      }
    }
    if (typeof indexedDB === "undefined") {
      if (!fallbackSaved) throw new Error("Draft storage unavailable");
      return;
    }
    try {
      await updateRecord(this.legacy.key, () =>
        JSON.stringify({
          version: 1,
          state,
          base: JSON.stringify(base),
          updatedAt,
        }),
      );
    } catch (error) {
      if (!fallbackSaved) throw error;
    }
  }
  async read(width: number, height: number, serverState: CanvasState | null) {
    if (typeof indexedDB === "undefined")
      return this.legacy.read(width, height, serverState);
    let localRaw: string | null = null;
    try {
      localRaw = localStorage.getItem(this.legacy.key);
    } catch {
      /* IndexedDB remains available. */
    }
    const timestamp = (raw: string | null) => {
      try {
        return Number(JSON.parse(raw ?? "null")?.updatedAt) || 0;
      } catch {
        return -1;
      }
    };
    let restored: ReturnType<CanvasDraftStore["read"]> = null;
    try {
      await updateRecord(this.legacy.key, (raw) => {
        let value =
          localRaw && timestamp(localRaw) >= timestamp(raw) ? localRaw : raw;
        const validator = new CanvasDraftStore(
          {
            getItem: () => value,
            setItem: (_, next) => {
              value = next;
            },
            removeItem: () => {
              value = null;
            },
          },
          this.userId,
          this.projectId,
        );
        restored = validator.read(width, height, serverState);
        // Both copies must agree; otherwise an acknowledged fallback could later
        // resurrect an older IndexedDB draft.
        try {
          if (localStorage.getItem(this.legacy.key) === localRaw) {
            if (value === null) localStorage.removeItem(this.legacy.key);
            else localStorage.setItem(this.legacy.key, value);
          }
        } catch {
          /* The IndexedDB copy is authoritative when localStorage is full. */
        }
        return value;
      });
    } catch {
      return this.legacy.read(width, height, serverState);
    }
    return restored;
  }
  async acknowledge(state: CanvasState) {
    let acknowledgedAt = -1;
    try {
      const local = JSON.parse(localStorage.getItem(this.legacy.key) ?? "null");
      if (JSON.stringify(local?.state) === JSON.stringify(state))
        acknowledgedAt = Number(local.updatedAt) || 0;
      this.legacy.acknowledge(state);
    } catch {
      /* Retry using IndexedDB. */
    }
    if (typeof indexedDB === "undefined") return;
    await updateRecord(this.legacy.key, (raw) => {
      if (!raw) return null;
      try {
        const draft = JSON.parse(raw);
        return JSON.stringify(draft.state) === JSON.stringify(state) ||
          (acknowledgedAt >= 0 &&
            (Number(draft.updatedAt) || 0) < acknowledgedAt)
          ? null
          : raw;
      } catch {
        return null;
      }
    });
  }
}

export async function clearCanvasDrafts() {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(CANVAS_DRAFT_PREFIX)) localStorage.removeItem(key);
  } catch {
    /* Continue clearing IndexedDB. */
  }
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
