import { render, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StylePicker } from "./style-picker";

const styles = [
  { code: "modern", name: "Современный", imageUrl: "/modern.webp" },
  { code: "japandi", name: "Джапанди", imageUrl: "/japandi.webp" },
];

function renderPicker() {
  const { container } = render(
    <StylePicker styles={styles} value={undefined} onChange={vi.fn()} />,
  );
  const scroller = within(container).getByRole("radiogroup", {
    name: "Стиль интерьера",
  });

  Object.defineProperties(scroller, {
    scrollWidth: { configurable: true, value: 500 },
    clientWidth: { configurable: true, value: 200 },
    scrollLeft: { configurable: true, value: 0, writable: true },
  });
  return scroller;
}

test("converts a vertical wheel gesture into horizontal style scrolling", () => {
  const scroller = renderPicker();
  const event = new WheelEvent("wheel", {
    cancelable: true,
    deltaY: 60,
  });

  scroller.dispatchEvent(event);

  expect(scroller.scrollLeft).toBe(60);
  expect(event.defaultPrevented).toBe(true);
});

test("allows the page to keep scrolling at the carousel boundary", () => {
  const scroller = renderPicker();
  scroller.scrollLeft = 300;
  const event = new WheelEvent("wheel", {
    cancelable: true,
    deltaY: 60,
  });

  scroller.dispatchEvent(event);

  expect(scroller.scrollLeft).toBe(300);
  expect(event.defaultPrevented).toBe(false);
});
