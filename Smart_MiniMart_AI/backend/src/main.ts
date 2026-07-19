import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

function parseCorsOrigins(raw: string | undefined): boolean | string | string[] {
  const value = (raw ?? '*').trim();
  if (!value || value === '*') {
    // Dev convenience — production should set explicit whitelist
    return true;
  }
  const list = value.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true;
  if (list.length === 1) return list[0];
  return list;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', 4000);
  const prefix = cfg.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const corsOrigin = parseCorsOrigins(cfg.get<string>('CORS_ORIGIN'));

  // Security headers
  app.use(
    helmet({
      // API JSON — không cần CORP/COEP chặt; CSP tắt để Swagger vẫn load được
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
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
  app.useGlobalInterceptors(new TransformInterceptor());

  if (cfg.get<string>('DISABLE_SWAGGER') !== 'true') {
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
  Logger.log(`📚 Swagger        → http://localhost:${port}/${prefix}/docs`, 'Bootstrap');
  Logger.log(
    `🔒 CORS origin   → ${typeof corsOrigin === 'boolean' ? (corsOrigin ? '*' : 'disabled') : JSON.stringify(corsOrigin)}`,
    'Bootstrap',
  );
}

bootstrap();
