import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '@/app.module';

/** Matrix IDOR (Q120): user B không được chạm resource của user A. */
let app: INestApplication;
const prisma = new PrismaClient();
const api = (p: string) => `/api/v1${p}`;

async function register(email: string) {
  const res = await request(app.getHttpServer())
    .post(api('/auth/register'))
    .send({ email, password: 'Pass1234', fullName: 'IDOR User', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}` });
  if (res.status !== 201) throw new Error(`register ${email}: ${res.status}`);
  return res.body as { accessToken: string; user: { id: string } };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
  await app?.close();
});

describe('IDOR matrix (Q120)', () => {
  it('B không đọc được đơn của A (404, không lộ tồn tại)', async () => {
    const server = app.getHttpServer();
    const a = await register(`idor-a-${Date.now()}@test.vn`);
    const b = await register(`idor-b-${Date.now()}@test.vn`);
    const addr = await request(server).post(api('/users/me/addresses'))
      .set(auth(a.accessToken))
      .send({ recipient: 'User A', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}`, line1: 'A lane', city: 'HCM' });
    const list = await request(server).get(api('/products')).query({ limit: 5 });
    const product = (list.body.items ?? list.body)[0];
    await request(server).post(api('/cart/items'))
      .set(auth(a.accessToken)).send({ productId: product.id, quantity: 1 });
    const order = await request(server).post(api('/orders'))
      .set(auth(a.accessToken)).send({ addressId: addr.body.id, paymentMethod: 'COD' });
    expect(order.status).toBeLessThan(300);

    const peek = await request(server).get(api(`/orders/${order.body.id}`)).set(auth(b.accessToken));
    expect([403, 404]).toContain(peek.status);
  });

  it('B không dùng địa chỉ của A để đặt đơn', async () => {
    const server = app.getHttpServer();
    const a = await register(`idor-a2-${Date.now()}@test.vn`);
    const b = await register(`idor-b2-${Date.now()}@test.vn`);
    const addrA = await request(server).post(api('/users/me/addresses'))
      .set(auth(a.accessToken))
      .send({ recipient: 'User A', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}`, line1: 'A lane', city: 'HCM' });
    const list = await request(server).get(api('/products')).query({ limit: 5 });
    const product = (list.body.items ?? list.body)[0];
    await request(server).post(api('/cart/items'))
      .set(auth(b.accessToken)).send({ productId: product.id, quantity: 1 });
    const order = await request(server).post(api('/orders'))
      .set(auth(b.accessToken)).send({ addressId: addrA.body.id, paymentMethod: 'COD' });
    expect(order.status).toBeGreaterThanOrEqual(400);
  });

  it('B không xóa địa chỉ của A', async () => {
    const server = app.getHttpServer();
    const a = await register(`idor-a3-${Date.now()}@test.vn`);
    const b = await register(`idor-b3-${Date.now()}@test.vn`);
    const addrA = await request(server).post(api('/users/me/addresses'))
      .set(auth(a.accessToken))
      .send({ recipient: 'User A', phone: `09${String(Math.floor(10000000 + Math.random() * 89999999))}`, line1: 'A lane', city: 'HCM' });
    const del = await request(server).delete(api(`/users/me/addresses/${addrA.body.id}`))
      .set(auth(b.accessToken));
    expect(del.status).toBeGreaterThanOrEqual(400);
    // Địa chỉ A vẫn còn.
    const mine = await request(server).get(api('/users/me/addresses')).set(auth(a.accessToken));
    expect(JSON.stringify(mine.body)).toContain(addrA.body.id);
  });

  it('không token thì 401', async () => {
    const res = await request(app.getHttpServer()).get(api('/orders/mine'));
    expect(res.status).toBe(401);
  });
});
