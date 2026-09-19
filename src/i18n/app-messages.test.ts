import assert from "node:assert/strict";
import test from "node:test";
import { appMessageKey, appMessages } from "./app-messages.ts";

test("next-intl app messages contain no namespace separators in keys", () => {
  for (const localeMessages of Object.values(appMessages)) {
    for (const key of Object.keys(localeMessages.App)) {
      assert.equal(key.includes("."), false, `invalid next-intl key: ${key}`);
    }
  }
});

test("sentence lookup uses the same normalized key in every locale", () => {
  const source = "Google используется только для безопасного входа.";
  const key = appMessageKey(source);

  assert.equal(appMessages.ru.App[key], source);
  assert.equal(
    appMessages.en.App[key],
    "Google is used only for secure sign-in.",
  );
  assert.equal(
    appMessages.uz.App[key],
    "Google faqat xavfsiz kirish uchun ishlatiladi.",
  );
});
