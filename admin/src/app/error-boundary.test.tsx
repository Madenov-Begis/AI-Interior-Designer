import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./error-boundary";

function Broken(): never {
  throw new Error("render failed");
}

it("recovers a route render failure without exposing internals", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <MantineProvider>
      <AppErrorBoundary><Broken /></AppErrorBoundary>
    </MantineProvider>,
  );
  expect(screen.getByRole("heading", { name: "Экран не удалось отобразить" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Вернуться на главную" })).toBeInTheDocument();
  expect(screen.queryByText("render failed")).not.toBeInTheDocument();
});
