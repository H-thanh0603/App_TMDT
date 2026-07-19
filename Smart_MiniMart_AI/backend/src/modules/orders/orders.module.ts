import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import {
  ORDER_REPOSITORY,
  PrismaOrderRepository,
} from './repositories/order.repository';

@Module({
  providers: [
    OrdersService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
  ],
  controllers: [OrdersController],
  exports: [OrdersService, ORDER_REPOSITORY],
})
export class OrdersModule {}
