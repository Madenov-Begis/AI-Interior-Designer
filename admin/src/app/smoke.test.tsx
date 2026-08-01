import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { PageFrame } from "../widgets/page-frame";

test("renders a desktop admin page heading", () => {
  render(
    <MantineProvider forceColorScheme="dark">
      <PageFrame title="Пользователи">content</PageFrame>
    </MantineProvider>,
  );
  expect(
    screen.getByRole("heading", { name: "Пользователи" }),
  ).toBeInTheDocument();
});
