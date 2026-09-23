// Q139: Sentry init TRƯỚC mọi import app để bắt lỗi boot (DSN trống = tự tắt, không crash).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/nestjs');
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  // Q64/Q139: scrub PII/token khỏi event trước khi gửi.
  beforeSend(event: Record<string, unknown>) {
    try {
      const scrub = (s: string) =>
        s
          .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
          .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
          .replace(/(sk-|xox|secret|password|token)[=:][^\s"']+/gi, '$1=[redacted]');
      const walk = (v: unknown): unknown => {
        if (typeof v === 'string') return scrub(v);
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === 'object')
          return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]));
        return v;
      };
      return walk(event) as typeof event;
    } catch {
      return event;
    }
  },
});

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

export function parseCorsOrigins(
  raw: string | undefined,
  nodeEnv: string = process.env.NODE_ENV ?? 'development',
): boolean | string | string[] {
  // Fail-closed: production BẮT BUỘC whitelist tường minh, không fallback '*'.
  // Dev giữ '*' để Expo Go / localhost tiện test.
  const isProd = nodeEnv === 'production';
  const value = (raw ?? (isProd ? '' : '*')).trim();
  if (!value) {
    if (isProd) throw new Error('CORS_ORIGIN là bắt buộc trên production (whitelist domain).');
    return true;
  }
  if (value === '*') {
    if (isProd)
      throw new Error('CORS_ORIGIN=* bị cấm trên production (đặt whitelist domain).');
    return true; // Reflect-any-origin dev. An toàn khi KHÔNG kèm credentials.
  }
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    if (isProd) throw new Error('CORS_ORIGIN là bắt buộc trên production (whitelist domain).');
    return true;
  }
  if (list.length === 1) return list[0];
  return list;
}

/**
 * Không bao giờ kết hợp `Access-Control-Allow-Origin: *` (reflect-any) với
 * `Access-Control-Allow-Credentials: true` — đó là cấu hình nguy hiểm.
 * App dùng Bearer token (không dùng cookie) nên tắt credentials khi wildcard là an toàn.
 */
export function buildCorsOptions(
  raw: string | undefined,
  nodeEnv: string,
): { origin: boolean | string | string[]; credentials: boolean } {
  // Q17: wildcard bị cấm ở parseCorsOrigins (throw), đây chỉ còn phòng thủ.
  const origin = parseCorsOrigins(raw, nodeEnv);
  const isWildcard = origin === true;
  if (isWildcard && nodeEnv === 'production') {
    throw new Error('CORS wildcard bị cấm trên production. Boot bị dừng (fail-closed).');
  }
  return { origin, credentials: !isWildcard };
}

/**
 * Cấu hình `trust proxy` (SEC-031).
 *
 * Không có nó, sau reverse proxy (Render/Nginx) `req.ip` luôn là IP của proxy:
 * - mọi người dùng chung 1 bucket rate limit → vừa dễ bị DoS vừa chặn nhầm khách,
 * - log audit và `vnp_IpAddr` gửi sang VNPay đều sai.
 *
 * Mặc định: 1 hop ở production, tắt ở development. Override bằng TRUST_PROXY
 * (`false` | `true` = 1 hop | số hop | dải CIDR/IP).
 */
export function buildTrustProxy(
  raw: string | undefined,
  nodeEnv: string,
): false | number | string {
  const value = (raw ?? '').trim();
  if (!value) return nodeEnv === 'production' ? 1 : false;
  if (value === 'false') return false;
  if (value === 'true') return 1;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : value;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', 4000);
  const prefix = cfg.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const cors = buildCorsOptions(cfg.get<string>('CORS_ORIGIN'), nodeEnv);

  // IP thật của client khi chạy sau proxy (ảnh hưởng rate limit + audit + VNPay IPN)
  const trustProxy = buildTrustProxy(cfg.get<string>('TRUST_PROXY'), nodeEnv);
  if (trustProxy !== false) app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');

  // X-Request-Id: giữ id do proxy sinh (nếu có) để tra log khi khách báo lỗi
  app.use((req: any, res: any, next: () => void) => {
    const incoming = String(req.headers?.['x-request-id'] ?? '').slice(0, 64).trim();
    const requestId = incoming || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // Security headers (Q51/Q52: HSTS + Referrer-Policy + frame-ancestors tường minh).
  app.use(
    helmet({
      // API JSON — không cần CORP/COEP chặt; CSP tắt để Swagger vẫn load được
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
    }),
  );

  app.enableCors({
    origin: cors.origin,
    credentials: cors.credentials,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Q159: robots.txt ở root (ngoài global prefix) — chặn crawler khỏi /api/* và /uploads/*.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/robots.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8');
    res.send('User-agent: *\nDisallow: /api/\nDisallow: /uploads/\n');
  });

  // Q54: giới hạn body JSON 1MB + URL-encoded — chống payload khổng lồ/JSON sâu gây DoS.
  // Upload file đi đường multer riêng (10MB + magic-bytes), không qua limit này.
  const express = await import('express');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // Graceful shutdown: đóng kết nối (Prisma) khi nhận SIGTERM/SIGINT
  app.enableShutdownHooks();

  // Swagger: bật ở dev mặc định; production PHẢI bật tường minh qua ENABLE_SWAGGER=true
  const swaggerEnabled =
    nodeEnv === 'production'
      ? cfg.get<string>('ENABLE_SWAGGER') === 'true'
      : cfg.get<string>('DISABLE_SWAGGER') !== 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Smart MiniMart AI API')
      .setDescription('Backend API cho hệ thống mobile commerce siêu thị mini')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${prefix}/docs`, app, document);
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Smart MiniMart API → http://localhost:${port}/${prefix}`, 'Bootstrap');
  Logger.log(
    `📚 Swagger        → ${swaggerEnabled ? `http://localhost:${port}/${prefix}/docs` : 'disabled'}`,
    'Bootstrap',
  );
  Logger.log(
    `🔒 CORS origin   → ${typeof cors.origin === 'boolean' ? (cors.origin ? '* (no credentials)' : 'disabled') : JSON.stringify(cors.origin)}`,
    'Bootstrap',
  );
}

// Chỉ tự chạy khi thực thi trực tiếp (không chạy khi import trong test)
if (require.main === module) {
  bootstrap();
}
