import { webcrypto } from "node:crypto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import type { VisualPromptEditorHandle } from "@/features/visual-prompt";
import { useWorkspaceGenerationActions } from "./workspace-generation-actions";

const requests = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../api/workspace-generations", () => ({
  createProjectGeneration: requests.create,
  cancelProjectGeneration: vi.fn(),
  retryProjectGeneration: vi.fn(),
  refineProjectGeneration: vi.fn(),
}));
vi.mock("@/features/auth/index.client", () => ({
  useAppSession: () => ({ user: { id: "user" } }),
}));
vi.mock("@/features/generate-design", () => ({
  RetryAttemptRegistry: class {},
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
  requests.create.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function editor(): VisualPromptEditorHandle {
  return {
    snapshot: vi.fn().mockResolvedValue(null),
    persist: vi.fn(),
    markPersisted: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
  };
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return renderHook(
    () =>
      useWorkspaceGenerationActions({
        projectId: "project",
        prompt: "Make the room brighter",
        aspectRatio: "RATIO_1_1",
        styleCode: undefined,
        visualPromptRef: { current: editor() },
        refinementPromptRef: { current: editor() },
        applyGenerationPayload: vi.fn(),
        invalidateCredits: vi.fn().mockResolvedValue(undefined),
        reconcileInsufficientCredits: vi.fn(),
        focusGeneration: vi.fn(),
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
}

test("a committed root request with a lost response reuses its key after remount", async () => {
  requests.create.mockRejectedValueOnce(new Error("response lost"));
  const first = mount();
  await act(async () => {
    await expect(
      first.result.current.createGeneration.mutateAsync(),
    ).rejects.toThrow("response lost");
  });
  const originalKey = requests.create.mock.calls[0][2];
  first.unmount();
  requests.create.mockResolvedValue({
    generation: { id: "reserved-generation" },
  });
  const next = mount();
  await act(async () => {
    await next.result.current.createGeneration.mutateAsync();
  });
  expect(requests.create.mock.calls[1][2]).toBe(originalKey);
  await act(async () => {
    await next.result.current.createGeneration.mutateAsync();
  });
  expect(requests.create.mock.calls[2][2]).not.toBe(originalKey);
});
