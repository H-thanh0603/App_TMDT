import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import {
  PRODUCT_REPOSITORY,
  PrismaProductRepository,
} from './repositories/product.repository';

@Module({
  providers: [
    ProductsService,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
  controllers: [ProductsController],
  exports: [ProductsService, PRODUCT_REPOSITORY],
})
export class ProductsModule {}
