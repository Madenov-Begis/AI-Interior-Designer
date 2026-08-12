import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ResourceTable } from "./resource-table";

it("renders compact labeled cards at the mobile breakpoint", () => {
  const original = window.matchMedia;
  window.matchMedia = (query: string) => ({
    matches: query.includes("47.99em"),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
  render(
    <MantineProvider>
      <ResourceTable
        items={[{ id: "1", name: "Запись" }]}
        getKey={(item) => item.id}
        columns={[{ key: "name", label: "Название", render: (item) => item.name }]}
      />
    </MantineProvider>,
  );
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByText("Название")).toBeInTheDocument();
  expect(screen.getByText("Запись")).toBeInTheDocument();
  window.matchMedia = original;
});
