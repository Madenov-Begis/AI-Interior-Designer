import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { PageFrame } from "@/shared/ui";

it("renders a page frame", () => {
  render(
    <MantineProvider>
      <PageFrame title="Проверка">Контент</PageFrame>
    </MantineProvider>,
  );
  expect(screen.getByRole("heading", { name: "Проверка" })).toBeInTheDocument();
  expect(screen.getByText("Контент")).toBeInTheDocument();
});
