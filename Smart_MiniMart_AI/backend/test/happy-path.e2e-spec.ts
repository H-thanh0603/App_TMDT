import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '@/app.module';

let app: INestApplication;
const prisma = new PrismaClient();
const api = (p: string) => `/api/v1${p}`;

async function register(email: string, password = 'Pass1234') {
  const res = await request(app.getHttpServer())
    .post(api('/auth/register'))
    .send({ email, password, fullName: 'Test User', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}` });
  if (res.status !== 201) throw new Error(`register ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { accessToken: string; user: { id: string } };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  // Seed tối thiểu: 1 category + 1 product active còn hàng.
  const cat = await prisma.category.upsert({
    where: { slug: 'e2e-cat' },
    update: {},
    create: { name: 'E2E Cat', slug: 'e2e-cat' },
  });
  await prisma.product.upsert({
    where: { sku: 'E2E-SKU-001' },
    update: { stock: 100, isActive: true },
    create: {
      sku: 'E2E-SKU-001', name: 'E2E Product', slug: 'e2e-product',
      price: 50000, stock: 100, isActive: true, categoryId: cat.id,
    },
  });
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
  await app?.close();
});

describe('happy path: register → cart → order → detail (Q119)', () => {
  it('đi hết flow mua COD', async () => {
    const server = app.getHttpServer();
    const email = `e2e-${Date.now()}@test.vn`;
    const { accessToken, user } = await register(email);
    expect(user.id).toBeDefined();

    // 1. Xem catalog (public).
    const list = await request(server).get(api('/products')).query({ limit: 5 });
    expect(list.status).toBe(200);
    const product = (list.body.items ?? list.body).find((p: any) => p.sku === 'E2E-SKU-001');
    expect(product).toBeDefined();

    // 2. Thêm vào giỏ.
    const add = await request(server).post(api('/cart/items'))
      .set(auth(accessToken)).send({ productId: product.id, quantity: 2 });
    expect(add.status).toBeLessThan(300);

    // 3. Tạo địa chỉ.
    const addr = await request(server).post(api('/users/me/addresses'))
      .set(auth(accessToken))
      .send({ recipient: 'Test', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}`, line1: '123 E2E', city: 'HCM' });
    expect(addr.status).toBeLessThan(300);

    // 4. Đặt đơn COD.
    const order = await request(server).post(api('/orders'))
      .set(auth(accessToken))
      .send({ addressId: addr.body.id, paymentMethod: 'COD' });
    expect(order.status).toBeLessThan(300);
    expect(order.body.id).toBeDefined();

    // 5. Đọc lại đơn của mình.
    const detail = await request(server).get(api(`/orders/${order.body.id}`)).set(auth(accessToken));
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(order.body.id);

    // 6. Đơn nằm trong list mine.
    const mine = await request(server).get(api('/orders/mine')).set(auth(accessToken));
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.body)).toContain(order.body.id);
  });

  it('double-tap tạo 2 đơn giống nhau thì đơn thứ 2 vẫn hợp lệ nhưng giỏ đã trống', async () => {
    const server = app.getHttpServer();
    const { accessToken } = await register(`e2e2-${Date.now()}@test.vn`);
    const list = await request(server).get(api('/products')).query({ limit: 5 });
    const product = (list.body.items ?? list.body).find((p: any) => p.sku === 'E2E-SKU-001');
    await request(server).post(api('/cart/items'))
      .set(auth(accessToken)).send({ productId: product.id, quantity: 1 });
    const addr = await request(server).post(api('/users/me/addresses'))
      .set(auth(accessToken))
      .send({ recipient: 'T2', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}`, line1: '456 E2E', city: 'HCM' });
    const o1 = await request(server).post(api('/orders'))
      .set(auth(accessToken)).send({ addressId: addr.body.id, paymentMethod: 'COD' });
    expect(o1.status).toBeLessThan(300);
    // Giỏ đã clear sau đặt đơn → đặt tiếp phải lỗi (giỏ trống).
    const o2 = await request(server).post(api('/orders'))
      .set(auth(accessToken)).send({ addressId: addr.body.id, paymentMethod: 'COD' });
    expect(o2.status).toBeGreaterThanOrEqual(400);
  });
});
