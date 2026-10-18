-- No account data migration: this release assumes no registered users.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "AppUser") THEN
    RAISE EXCEPTION 'Auth schema change requires an empty AppUser table; existing accounts require a separate plan.';
  END IF;
END $$;
DROP INDEX "AppUser_authId_key";
ALTER TABLE "AppUser" DROP COLUMN "authId", ADD COLUMN "passwordHash" TEXT NOT NULL;
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
CREATE TABLE "AuthAttempt" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthAttempt_expiresAt_idx" ON "AuthAttempt"("expiresAt");
