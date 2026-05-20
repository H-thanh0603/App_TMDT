import {
  Body, Controller, Get, Param, Patch, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Cấu hình cửa hàng public (cho mobile app)' })
  getPublic() {
    return this.settings.getStorePublicConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.STORE_ADMIN)
  @Get()
  @ApiOperation({ summary: '[Admin] Tất cả settings' })
  list() {
    return this.settings.list();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.STORE_ADMIN)
  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.STORE_ADMIN)
  @Patch(':key')
  @ApiOperation({ summary: '[Admin] Cập nhật setting' })
  update(@Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.settings.upsert(key, dto.value);
  }
}
