import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';

import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ImportReceiptsModule } from './modules/import-receipts/import-receipts.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AIGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { AIManagerModule } from './modules/ai-manager/ai-manager.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    // Rate limit: mặc định 100 req/phút, cấu hình qua THROTTLE_TTL (giây) / THROTTLE_LIMIT.
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1_000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    // Serve file upload (ảnh sản phẩm / review / OCR). ServeStaticModule set prefix
    // NEST_STATIC_PREFIX, mặc định /uploads, serve từ UPLOAD_DIR (mặc định ./uploads).
    ServeStaticModule.forRoot({
      rootPath: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
      serveRoot: process.env.NEST_STATIC_PREFIX || '/uploads',
      exclude: ['/api/(.*)'],
      // Q112: ảnh immutable cache 7 ngày (tên file UUID, đổi tên khi đổi ảnh).
      serveStaticOptions: { maxAge: '7d', immutable: true },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    InventoryModule,
    ImportReceiptsModule,
    PromotionsModule,
    ReviewsModule,
    AIGatewayModule,
    AIManagerModule,
    HealthModule,
    NotificationsModule,
    SettingsModule,
    PaymentsModule,
    UploadsModule,
  ],
  providers: [
    // JwtAuthGuard chạy TOÀN CỤC (fail-closed): mọi route mặc định yêu cầu đăng nhập,
    // muốn public phải khai báo tường minh @Public(). Đặt trước Throttler để guard
    // rate-limit biết `req.user` → bucket theo user thay vì theo IP.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limit: 100 req / 60s (theo user nếu đã đăng nhập, ngược lại theo IP)
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
