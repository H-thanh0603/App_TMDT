CREATE TABLE "payment_confirmations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bankTransactionRef" TEXT NOT NULL,
    "note" TEXT,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_confirmations_orderId_key" ON "payment_confirmations"("orderId");
CREATE INDEX "payment_confirmations_confirmedById_idx" ON "payment_confirmations"("confirmedById");

ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
