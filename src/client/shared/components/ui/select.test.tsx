import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, test } from "vitest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value() {},
  });
});

test("authored room select opens from the keyboard and closes with Escape", async () => {
  render(
    <Select>
      <SelectTrigger aria-label="Комната">
        <SelectValue placeholder="Выберите комнату" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="living-room">Гостиная</SelectItem>
        <SelectItem value="bedroom">Спальня</SelectItem>
      </SelectContent>
    </Select>,
  );

  const trigger = screen.getByRole("combobox", { name: "Комната" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(await screen.findByRole("option", { name: "Спальня" })).not.toBeNull();

  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("option", { name: "Спальня" })).toBeNull(),
  );
});

test("renders the popup inside a supplied modal container", async () => {
  const modalContainer = document.createElement("div");
  document.body.append(modalContainer);

  render(
    <Select>
      <SelectTrigger aria-label="Комната в диалоге">
        <SelectValue placeholder="Выберите комнату" />
      </SelectTrigger>
      <SelectContent portalContainer={modalContainer}>
        <SelectItem value="living-room">Гостиная</SelectItem>
      </SelectContent>
    </Select>,
  );

  fireEvent.click(
    screen.getByRole("combobox", { name: "Комната в диалоге" }),
  );
  const option = await screen.findByRole("option", { name: "Гостиная" });

  expect(modalContainer.contains(option)).toBe(true);
  modalContainer.remove();
});
