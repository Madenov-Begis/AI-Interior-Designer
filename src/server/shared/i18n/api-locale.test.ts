import assert from "node:assert/strict";
import test from "node:test";
import {
  localizeApiMessage,
  localizeGenerationMessage,
  resolveApiLocale,
} from "./api-locale.ts";

test("выбирает поддерживаемый язык с учётом региона и q", () => {
  assert.equal(resolveApiLocale("de-DE, uz-UZ;q=0.8, ru;q=0.6"), "uz");
  assert.equal(resolveApiLocale("ru-RU;q=0.7, en-US;q=0.9"), "en");
  assert.equal(resolveApiLocale("uz-Cyrl-UZ"), "uz");
});

test("использует английский fallback для неизвестного или пустого языка", () => {
  assert.equal(resolveApiLocale("de-DE, fr;q=0.8"), "en");
  assert.equal(resolveApiLocale(null), "en");
  assert.equal(resolveApiLocale("ru;q=0, uz;q=0"), "en");
});

test("локализует одинаковый error code без изменения контракта", () => {
  assert.equal(
    localizeApiMessage("en", "PROJECT_NOT_FOUND", "Проект не найден"),
    "Project not found",
  );
  assert.equal(
    localizeApiMessage("uz", "PROJECT_NOT_FOUND", "Проект не найден"),
    "Loyiha topilmadi",
  );
  assert.equal(
    localizeApiMessage("ru", "PROJECT_NOT_FOUND", "Проект не найден"),
    "Проект не найден",
  );
});

test("локализует сохранённую ошибку генерации по стабильному коду", () => {
  assert.equal(
    localizeGenerationMessage(
      "en",
      "GENERATION_EXPIRED",
      "Генерация не завершилась вовремя. Кредиты возвращены.",
    ),
    "Generation did not finish in time. Your credits were returned",
  );
});
