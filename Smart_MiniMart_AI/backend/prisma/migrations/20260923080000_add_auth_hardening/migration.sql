-- Q23/Q24/Q29: lockout + reset-password + MFA TOTP cho User
ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "mfaRecoveryHash" TEXT;
ALTER TABLE "users" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN "resetExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_resetTokenHash_key" ON "users"("resetTokenHash");
