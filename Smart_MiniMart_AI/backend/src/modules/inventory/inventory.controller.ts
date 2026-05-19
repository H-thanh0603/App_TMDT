import {
  Body, Controller, Get, Patch, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STORE_ADMIN, Role.STAFF)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Lịch sử nhập/xuất kho' })
  listTransactions(
    @Query('productId') productId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventory.listTransactions(productId, limit ? parseInt(limit, 10) : 50);
  }

  @Patch('adjust')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho thủ công' })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser('sub') userId: string) {
    return this.inventory.adjustStock(dto, userId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Hàng gần hết hạn (mặc định 30 ngày)' })
  expiring(@Query('days') days?: string) {
    return this.inventory.expiringProducts(days ? parseInt(days, 10) : 30);
  }

  @Get('slow-moving')
  @ApiOperation({ summary: 'Hàng bán chậm 30 ngày qua' })
  slow(@Query('days') days?: string, @Query('minStock') minStock?: string) {
    return this.inventory.slowMovingProducts(
      days ? parseInt(days, 10) : 30,
      minStock ? parseInt(minStock, 10) : 10,
    );
  }

  @Get('restock-suggestions')
  @ApiOperation({ summary: 'Gợi ý nhập hàng dựa trên tốc độ bán' })
  restock(@Query('days') days?: string) {
    return this.inventory.restockSuggestions(days ? parseInt(days, 10) : 30);
  }
}
