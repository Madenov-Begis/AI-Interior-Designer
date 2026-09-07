CREATE TYPE "LegalAcceptanceMethod" AS ENUM ('OAUTH_LOGIN_CHECKBOX');

CREATE TABLE "LegalAcceptance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL,
    "publicOfferVersion" TEXT NOT NULL,
    "method" "LegalAcceptanceMethod" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalAcceptance_userId_privacyPolicyVersion_publicOfferVersion_key"
ON "LegalAcceptance"("userId", "privacyPolicyVersion", "publicOfferVersion");

CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx"
ON "LegalAcceptance"("userId", "acceptedAt");

ALTER TABLE "LegalAcceptance"
ADD CONSTRAINT "LegalAcceptance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LegalAcceptance" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LegalAcceptance" FROM anon, authenticated;
