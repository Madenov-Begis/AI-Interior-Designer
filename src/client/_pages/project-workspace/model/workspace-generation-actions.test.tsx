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
function mount(
  onRootGenerationSuccess = vi.fn(),
  onRootGenerationError = vi.fn(),
) {
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
        roomTypeId: "00000000-0000-4000-8000-000000000010",
        visualPromptRef: { current: editor() },
        refinementPromptRef: { current: editor() },
        applyGenerationPayload: vi.fn(),
        invalidateCredits: vi.fn().mockResolvedValue(undefined),
        reconcileInsufficientCredits: vi.fn(),
        focusGeneration: vi.fn(),
        onRootGenerationSuccess,
        onRootGenerationError,
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

test("submits the selected room and resets it after an accepted root generation", async () => {
  const onRootGenerationSuccess = vi.fn();
  requests.create.mockResolvedValue({
    generation: { id: "reserved-generation", status: "QUEUED" },
  });
  const mounted = mount(onRootGenerationSuccess);

  await act(async () => {
    await mounted.result.current.createGeneration.mutateAsync();
  });

  const body = requests.create.mock.calls[0][1] as FormData;
  expect(body.get("roomTypeId")).toBe("00000000-0000-4000-8000-000000000010");
  expect(onRootGenerationSuccess).toHaveBeenCalledOnce();
});

test("keeps the selected room when a root generation is rejected", async () => {
  const onRootGenerationSuccess = vi.fn();
  requests.create.mockResolvedValue({
    generation: { id: "rejected-generation", status: "REJECTED" },
  });
  const mounted = mount(onRootGenerationSuccess);

  await act(async () => {
    await mounted.result.current.createGeneration.mutateAsync();
  });

  expect(onRootGenerationSuccess).not.toHaveBeenCalled();
});

test("retains the form and reports an authoritative root request error", async () => {
  const onRootGenerationSuccess = vi.fn();
  const onRootGenerationError = vi.fn();
  const error = new Error("Выбранная комната больше недоступна");
  requests.create.mockRejectedValue(error);
  const mounted = mount(onRootGenerationSuccess, onRootGenerationError);

  await act(async () => {
    await expect(
      mounted.result.current.createGeneration.mutateAsync(),
    ).rejects.toBe(error);
  });

  expect(onRootGenerationSuccess).not.toHaveBeenCalled();
  expect(onRootGenerationError).toHaveBeenCalledWith(error);
});
