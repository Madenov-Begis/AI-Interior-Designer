import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { EmptySourceWorkspace } from "./empty-source-workspace";
import type { GenerationDraft } from "../model/use-generation-draft";

vi.mock("./source-upload", () => ({
  SourceUpload: () => <button type="button">Загрузить фото комнаты</button>,
}));
vi.mock("./workspace-inspector-panel", () => ({
  useWorkspaceInspectorPanel: () => ({
    dialogRef: () => {},
    dialogNode: null,
    triggerRef: { current: null },
    open: false,
    desktop: true,
    show: () => {},
    close: () => {},
    onClosed: () => {},
  }),
  WorkspaceInspectorTrigger: () => <button type="button">Настройки</button>,
  WorkspaceInspectorPanel: ({
    inspectorProps,
  }: {
    inspectorProps: { prompt: string; disabledReasons: string[] };
  }) => (
    <aside>
      <span>{inspectorProps.prompt}</span>
      <span>{inspectorProps.disabledReasons.join(" ")}</span>
    </aside>
  ),
}));
vi.mock("@/features/auth/index.client", () => ({
  useAppSession: () => ({ wallet: { balance: 10, generationCost: 4 } }),
}));
vi.mock("@/shared/providers", () => ({
  useAppText: () => (text: string) => text,
}));

test("пустой проект сразу показывает холст, загрузку и настройки", () => {
  const draft = {
    prompt: "Светлый интерьер",
    setPrompt: vi.fn(),
    aspectRatio: "SOURCE",
    setAspectRatio: vi.fn(),
    styleCode: undefined,
    setStyleCode: vi.fn(),
    roomTypeId: undefined,
    setRoomTypeId: vi.fn(),
    availableRoomTypeId: undefined,
    roomsQuery: {
      data: { items: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    },
  } as unknown as GenerationDraft;
  render(
    <EmptySourceWorkspace
      projectId="project-1"
      initialReferences={[]}
      draft={draft}
    />,
  );
  expect(screen.getByRole("region", { name: "Холст проекта" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Загрузить фото комнаты" }),
  ).toBeTruthy();
  expect(screen.getByText("Светлый интерьер")).toBeTruthy();
  expect(screen.getByText("Загрузите фото комнаты")).toBeTruthy();
});
