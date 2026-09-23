import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

/** Vai trò được xem sản phẩm đã ngừng bán (SEC-022). */
const CAN_SEE_INACTIVE: readonly Role[] = [Role.STORE_ADMIN, Role.STAFF];

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  /** Token hợp lệ (nếu có) → cho phép admin/staff xem cả sản phẩm đã ẩn. */
  private canSeeInactive(role?: string): boolean {
    return !!role && CAN_SEE_INACTIVE.includes(role as Role);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm có lọc + phân trang' })
  list(@Query() q: ProductQueryDto, @CurrentUser('role') role?: string) {
    // Q74/Q84 defense-in-depth: DTO đã @Min(1) nhưng implicit conversion có thể
    // cho NaN lọt qua → clamp ở controller trước khi xuống service.
    if (!Number.isFinite(q.page) || (q.page as number) < 1) q.page = 1;
    if (!Number.isFinite(q.limit) || (q.limit as number) < 1) q.limit = 20;
    q.limit = Math.min(q.limit as number, 100);
    return this.products.list(q, { allowInactive: this.canSeeInactive(role) });
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Sản phẩm nổi bật / bán chạy' })
  featured(@Query('limit') limit?: string) {
    // parseInt('abc') = NaN → service clamp về 10 (Q84).
    return this.products.findFeatured(limit ? parseInt(limit, 10) : 10);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo id hoặc slug' })
  findOne(@Param('idOrSlug') idOrSlug: string, @CurrentUser('role') role?: string) {
    return this.products.findOne(idOrSlug, { allowInactive: this.canSeeInactive(role) });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm (Admin)' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
