import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private promotions: PromotionsService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Khuyến mãi đang hoạt động (public)' })
  active() {
    return this.promotions.listActive();
  }

  @Public()
  @Get('code/:code')
  byCode(@Param('code') code: string) {
    return this.promotions.findByCode(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Get()
  list() {
    return this.promotions.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotions.remove(id);
  }
}
