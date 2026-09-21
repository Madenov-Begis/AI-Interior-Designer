import assert from "node:assert/strict";
import test from "node:test";
import { localizedName, localizedOptionalText } from "./catalog.ts";

test("выбирает CRUD-перевод и использует fallback uz → en → ru", () => {
  const item = { name: "Гостиная", nameEn: "Living room", nameUz: null };
  assert.equal(localizedName(item, "ru"), "Гостиная");
  assert.equal(localizedName(item, "en"), "Living room");
  assert.equal(localizedName(item, "uz"), "Living room");
  assert.equal(localizedName({ ...item, nameEn: null }, "uz"), "Гостиная");
});

test("локализует optional-описание с тем же fallback", () => {
  const item = {
    description: "Для ремонта",
    descriptionEn: "For renovation",
    descriptionUz: null,
  };
  assert.equal(localizedOptionalText(item, "uz"), "For renovation");
  assert.equal(localizedOptionalText(item, "ru"), "Для ремонта");
});
