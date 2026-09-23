import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { uploadProjectSource } from "@/features/upload-media";
import { SourceUpload } from "./source-upload";

const invalidateQueries = vi.fn(async () => undefined);

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));
vi.mock("@/features/upload-media", () => ({
  isAcceptedSourceFile: (file: File) =>
    file.type === "image/png" && file.size > 0,
  uploadProjectSource: vi.fn(),
}));
vi.mock("@/shared/providers", () => ({
  useAppText: () => (text: string, values?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? "")),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:room-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(cleanup);

function selectPhoto(name = "room.png") {
  fireEvent.change(
    screen.getByLabelText("Выбрать фотографию помещения", {
      selector: "input",
    }),
    {
      target: {
        files: [new File(["pixels"], name, { type: "image/png" })],
      },
    },
  );
}

test("пустой холст предлагает выбор файла и сообщает ограничения", () => {
  render(<SourceUpload projectId="project-1" />);

  expect(screen.getByRole("button", { name: "Выбрать фото" })).toBeTruthy();
  expect(screen.getByText("Перетащите фото сюда")).toBeTruthy();
  expect(screen.getByText("JPG, PNG или WEBP · до 15 МБ")).toBeTruthy();
});

test("выбор показывает превью и не отправляет файл без подтверждения", () => {
  render(<SourceUpload projectId="project-1" />);
  selectPhoto();

  expect(
    screen.getByRole("img", { name: "Выбранное фото комнаты" }),
  ).toBeTruthy();
  expect(screen.getByText("room.png")).toBeTruthy();
  expect(screen.getAllByText("Фото готово к загрузке")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeTruthy();
  expect(uploadProjectSource).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole("button", { name: "Убрать выбранное фото" }),
  );
  expect(screen.getByRole("button", { name: "Выбрать фото" })).toBeTruthy();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:room-preview");
});

test("ошибка формата сохраняет выбранный снимок и даёт исправить выбор", () => {
  render(<SourceUpload projectId="project-1" />);
  selectPhoto();

  fireEvent.change(
    screen.getByLabelText("Выбрать фотографию помещения", {
      selector: "input",
    }),
    {
      target: {
        files: [new File(["x"], "wrong.gif", { type: "image/gif" })],
      },
    },
  );

  expect(screen.getByRole("alert").textContent).toContain(
    "Выберите JPG, PNG или WEBP размером не более 15 МБ.",
  );
  expect(screen.getByText("room.png")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeTruthy();
});

test("загрузка показывает прогресс и позволяет отменить запрос", () => {
  vi.mocked(uploadProjectSource).mockImplementation(
    () => new Promise(() => {}),
  );
  render(<SourceUpload projectId="project-1" />);
  selectPhoto();
  fireEvent.click(screen.getByRole("button", { name: "Загрузить фото" }));

  expect(uploadProjectSource).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "0",
  );
  expect(
    screen
      .getByRole("button", { name: "Загружаем фото" })
      .hasAttribute("disabled"),
  ).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Отменить" }));
  expect(vi.mocked(uploadProjectSource).mock.calls[0][0].signal.aborted).toBe(
    true,
  );
  expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeTruthy();
});

test("после ошибки сервера можно повторить загрузку того же файла", async () => {
  vi.mocked(uploadProjectSource)
    .mockRejectedValueOnce(new Error("Временная ошибка сети"))
    .mockResolvedValueOnce({});
  render(<SourceUpload projectId="project-1" />);
  selectPhoto();
  fireEvent.click(screen.getByRole("button", { name: "Загрузить фото" }));

  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Временная ошибка сети",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Попробовать загрузить ещё раз" }),
  );

  await waitFor(() =>
    expect(screen.getByText("Фото загружено. Открываем холст…")).toBeTruthy(),
  );
  expect(uploadProjectSource).toHaveBeenCalledTimes(2);
  expect(invalidateQueries).toHaveBeenCalledTimes(1);
});

test("при перетаскивании зона показывает, куда отпустить фото", () => {
  const { container } = render(<SourceUpload projectId="project-1" />);
  const zone = container.firstElementChild as HTMLElement;

  fireEvent.dragEnter(zone);
  expect(screen.getByText("Отпустите фото для загрузки")).toBeTruthy();

  fireEvent.dragLeave(zone);
  expect(screen.getByText("Перетащите фото сюда")).toBeTruthy();
});

test("после перетаскивания фото появляется предпросмотр без отправки", () => {
  const { container } = render(<SourceUpload projectId="project-1" />);
  const zone = container.firstElementChild as HTMLElement;

  fireEvent.drop(zone, {
    dataTransfer: {
      files: [new File(["pixels"], "dropped-room.png", { type: "image/png" })],
    },
  });

  expect(screen.getByText("dropped-room.png")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeTruthy();
  expect(uploadProjectSource).not.toHaveBeenCalled();
});
