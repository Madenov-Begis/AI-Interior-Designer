import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("OAuth requires and persists versioned legal acceptance", async () => {
  const [loginPanel, oauthRoute, callbackRoute, schema, migration] =
    await Promise.all([
      readFile(
        new URL(
          "../../../client/features/auth/ui/google-sign-in-panel.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../../app/api/v1/auth/google/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("./native-callback.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../../../prisma/schema.prisma", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../../../prisma/migrations/20260924000000_baseline/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(loginPanel, /type="checkbox"/);
  assert.match(loginPanel, /legalAcceptance/);
  assert.match(oauthRoute, /isCurrentLegalAcceptance/);
  assert.match(oauthRoute, /httpOnly: true/);
  assert.match(callbackRoute, /consumeLegalAcceptance/);
  assert.match(schema, /model LegalAcceptance/);
  assert.match(migration, /CREATE TABLE "LegalAcceptance"/);
  assert.match(migration, /"LegalAcceptance_userId_fkey"/);
});

test("legal pages and footer expose both localized documents", async () => {
  const [privacyPage, offerPage, legalDocument, footer] = await Promise.all([
    readFile(new URL("../../../app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../app/offer/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../../../app/_components/markdown-legal-document.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../../client/_pages/landing/ui/site-footer.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(privacyPage, /document="privacy-policy"/);
  assert.match(offerPage, /document="public-offer"/);
  assert.match(legalDocument, /`\$\{document\}\.\$\{locale\}\.md`/);
  assert.match(footer, /LEGAL_ROUTES\.privacy/);
  assert.match(footer, /LEGAL_ROUTES\.offer/);
});
