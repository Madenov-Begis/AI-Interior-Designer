import "server-only";

import { cookies } from "next/headers";
import { getDb } from "@/server/shared/db/prisma";
import { PRIVACY_POLICY_VERSION, PUBLIC_OFFER_VERSION } from "@config/legal";
import {
  authCookieDomain,
  authCookieSecure,
} from "@/server/shared/auth/cookie-domain";

export const LEGAL_ACCEPTANCE_COOKIE = "ruvie_legal_acceptance";
export const LEGAL_ACCEPTANCE_COOKIE_VALUE = `${PRIVACY_POLICY_VERSION}:${PUBLIC_OFFER_VERSION}`;

export function isCurrentLegalAcceptance(value: string | null | undefined) {
  return value === LEGAL_ACCEPTANCE_COOKIE_VALUE;
}

export async function consumeLegalAcceptance(userId: string) {
  const cookieStore = await cookies();
  const accepted = isCurrentLegalAcceptance(
    cookieStore.get(LEGAL_ACCEPTANCE_COOKIE)?.value,
  );

  if (!accepted) throw new Error("LEGAL_ACCEPTANCE_REQUIRED");

  await getDb().legalAcceptance.createMany({
    data: {
      userId,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      publicOfferVersion: PUBLIC_OFFER_VERSION,
      method: "OAUTH_LOGIN_CHECKBOX",
    },
    skipDuplicates: true,
  });

  cookieStore.set(LEGAL_ACCEPTANCE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: authCookieSecure(process.env.NODE_ENV, process.env.APP_URL),
    path: "/",
    domain: authCookieDomain(
      process.env.NODE_ENV,
      process.env.AUTH_COOKIE_DOMAIN,
      process.env.APP_URL,
    ),
    maxAge: 0,
  });
}
