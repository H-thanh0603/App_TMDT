import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo đơn hàng từ giỏ hiện tại (Customer)' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Đơn hàng của tôi (Customer)' })
  myOrders(@CurrentUser('sub') userId: string, @Query() q: OrderQueryDto) {
    return this.orders.listMyOrders(userId, q);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.orders.findOne(id, userId, role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.STAFF)
  @Get()
  @ApiOperation({ summary: 'Tất cả đơn hàng (Staff/Admin)' })
  listAll(@Query() q: OrderQueryDto) {
    return this.orders.listAllOrders(q);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.STAFF)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn (Staff/Admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') staffId: string,
  ) {
    return this.orders.updateStatus(id, dto, staffId);
  }
}
