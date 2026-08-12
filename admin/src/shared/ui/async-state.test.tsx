import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { AsyncState } from "./async-state";

function renderState(props: Partial<React.ComponentProps<typeof AsyncState>> = {}) {
  const onRetry = vi.fn();
  render(
    <MantineProvider>
      <AsyncState loading={false} error={false} onRetry={onRetry} {...props}>
        Готово
      </AsyncState>
    </MantineProvider>,
  );
  return onRetry;
}

describe("AsyncState", () => {
  it("renders loading, empty and success states", () => {
    const { rerender } = render(
      <MantineProvider><AsyncState loading error={false} onRetry={() => undefined}>Готово</AsyncState></MantineProvider>,
    );
    expect(screen.getByLabelText("Загрузка")).toBeInTheDocument();
    rerender(<MantineProvider><AsyncState loading={false} error={false} empty onRetry={() => undefined}>Готово</AsyncState></MantineProvider>);
    expect(screen.getByText("По выбранным условиям данных нет")).toBeInTheDocument();
    rerender(<MantineProvider><AsyncState loading={false} error={false} onRetry={() => undefined}>Готово</AsyncState></MantineProvider>);
    expect(screen.getByText("Готово")).toBeInTheDocument();
  });

  it("offers a local retry from the error state", () => {
    const retry = renderState({ error: true });
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
