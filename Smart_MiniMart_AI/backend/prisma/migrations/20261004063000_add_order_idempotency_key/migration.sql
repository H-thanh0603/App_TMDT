-- SEC-004: idempotency key cho checkout retry-after-timeout (retry cùng key 24h → trả đơn cũ)
ALTER TABLE "orders" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- Rollback: DROP INDEX "orders_idempotencyKey_key"; ALTER TABLE "orders" DROP COLUMN "idempotencyKey";
