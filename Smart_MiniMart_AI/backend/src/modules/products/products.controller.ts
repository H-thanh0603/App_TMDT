import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm có lọc + phân trang' })
  list(@Query() q: ProductQueryDto) {
    return this.products.list(q);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Sản phẩm nổi bật / bán chạy' })
  featured(@Query('limit') limit?: string) {
    return this.products.findFeatured(limit ? parseInt(limit, 10) : 10);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo id hoặc slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.products.findOne(idOrSlug);
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
