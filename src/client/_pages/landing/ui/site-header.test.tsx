import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { expect, test, vi } from "vitest";
import dictionary from "../model/locales/ru";
import { SiteHeader } from "./site-header";

vi.mock("@/i18n/navigation", () => ({
  LocaleLink: ({
    children,
    locale,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    locale: string;
  }) => (
    <a {...props} href={`/${locale}`}>
      {children}
    </a>
  ),
}));

test("показывает единый header лендинга со входом", () => {
  const { container } = render(<SiteHeader dictionary={dictionary} />);

  const login = screen.getByRole("link", { name: "Войти" });
  expect(login.getAttribute("href")).toBe("/login");
  expect(container.querySelector(".landing-shell")).not.toBeNull();
  expect(screen.queryByText("Загрузить фото бесплатно")).toBeNull();
  expect(
    screen.getByRole("link", { name: "ru" }).getAttribute("aria-current"),
  ).toBe("page");
});
