import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

export function parseCorsOrigins(raw: string | undefined): boolean | string | string[] {
  const value = (raw ?? '*').trim();
  if (!value || value === '*') {
    // Reflect-any-origin. An toàn khi KHÔNG kèm credentials (xem buildCorsOptions).
    return true;
  }
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
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
  const origin = parseCorsOrigins(raw);
  const isWildcard = origin === true;
  if (isWildcard && nodeEnv === 'production') {
    Logger.warn(
      'CORS_ORIGIN không được giới hạn (=*) trên production — hãy đặt whitelist origin cụ thể.',
      'Bootstrap',
    );
  }
  return { origin, credentials: !isWildcard };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', 4000);
  const prefix = cfg.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const cors = buildCorsOptions(cfg.get<string>('CORS_ORIGIN'), nodeEnv);

  // Security headers
  app.use(
    helmet({
      // API JSON — không cần CORP/COEP chặt; CSP tắt để Swagger vẫn load được
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: cors.origin,
    credentials: cors.credentials,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

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
