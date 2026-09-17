import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SiteHeader } from "./site-header";

test("показывает единый header лендинга со входом", () => {
  const { container } = render(<SiteHeader />);

  const login = screen.getByRole("link", { name: "Войти" });
  expect(login.getAttribute("href")).toBe("/login");
  expect(container.querySelector(".landing-shell")).not.toBeNull();
  expect(screen.queryByText("Загрузить фото бесплатно")).toBeNull();
});
