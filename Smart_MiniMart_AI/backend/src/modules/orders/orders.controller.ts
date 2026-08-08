import { Body, Controller, Get, Header, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { SkipTransform } from '@/common/decorators/skip-transform.decorator';

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

  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.STAFF)
  @Get('summary')
  @ApiOperation({ summary: 'KPI đơn hàng tổng hợp, không giới hạn phân trang' })
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.orders.getSummary(from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.STAFF)
  @Get('report')
  @ApiOperation({ summary: 'Báo cáo doanh thu theo ngày + top sản phẩm (Staff/Admin)' })
  report(@Query('from') from?: string, @Query('to') to?: string) {
    return this.orders.getReport(from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.STAFF)
  @Get('report/export')
  @SkipTransform()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Xuất báo cáo CSV (Staff/Admin)' })
  async exportReport(
    @Res({ passthrough: true }) res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.orders.exportReportCsv(from, to);
    res.attachment(`minimart-report-${new Date().toISOString().slice(0, 10)}.csv`);
    return csv;
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
