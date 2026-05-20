import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', 4000);
  const prefix = cfg.get<string>('API_PREFIX', 'api/v1');

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

  const config = new DocumentBuilder()
    .setTitle('Smart MiniMart AI API')
    .setDescription('Backend API cho hệ thống mobile commerce siêu thị mini')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Smart MiniMart API → http://localhost:${port}/${prefix}`, 'Bootstrap');
  Logger.log(`🌐 LAN access     → http://192.168.x.x:${port}/${prefix} (mobile)`, 'Bootstrap');
  Logger.log(`📚 Swagger        → http://localhost:${port}/${prefix}/docs`, 'Bootstrap');
}

bootstrap();
