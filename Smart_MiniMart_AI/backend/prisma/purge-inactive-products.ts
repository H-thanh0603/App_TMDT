/**
 * Purge inactive crawled products (OFF-/DJ-/FS-) not referenced by orders/cart.
 * Keeps seed products even if somehow inactive.
 *
 * Run: npm run db:purge-inactive
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purge inactive crawled products...');

  const inactive = await prisma.product.findMany({
    where: {
      isActive: false,
      OR: [
        { sku: { startsWith: 'OFF-' } },
        { sku: { startsWith: 'DJ-' } },
        { sku: { startsWith: 'FS-' } },
        { attributes: { path: ['source'], equals: 'dummyjson' } },
        { attributes: { path: ['source'], equals: 'fakestore' } },
        {
          AND: [
            { attributes: { path: ['source'], equals: 'openfoodfacts' } },
            { NOT: { attributes: { path: ['market'], equals: 'vietnam' } } },
          ],
        },
      ],
    },
    select: { id: true, sku: true },
  });
  console.log(`  candidates: ${inactive.length}`);

  let deleted = 0;
  let skipped = 0;
  for (const p of inactive) {
    const [oi, ci, ri, pp, iri] = await Promise.all([
      prisma.orderItem.count({ where: { productId: p.id } }),
      prisma.cartItem.count({ where: { productId: p.id } }),
      prisma.review.count({ where: { productId: p.id } }),
      prisma.promotionProduct.count({ where: { productId: p.id } }),
      prisma.importReceiptItem.count({ where: { productId: p.id } }),
    ]);
    if (oi + ci + ri + pp + iri > 0) {
      skipped++;
      continue;
    }
    // delete related non-blocking rows first
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    await prisma.inventoryTransaction.deleteMany({ where: { productId: p.id } });
    await prisma.product.delete({ where: { id: p.id } });
    deleted++;
  }

  const active = await prisma.product.count({ where: { isActive: true } });
  const inactiveLeft = await prisma.product.count({ where: { isActive: false } });
  console.log(`✅ deleted=${deleted}, skipped_referenced=${skipped}`);
  console.log(`   products active=${active}, inactive_left=${inactiveLeft}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
