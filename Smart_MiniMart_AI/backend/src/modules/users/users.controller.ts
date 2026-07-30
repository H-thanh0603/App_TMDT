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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddressDto } from './dto/address.dto';
import { CreateStaffDto, UpdateStaffDto, AdjustLoyaltyDto } from './dto/admin-users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  // ========== Self-service ==========

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật hồ sơ cá nhân' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Thống kê đơn hàng + điểm thưởng cá nhân' })
  myStats(@CurrentUser('sub') userId: string) {
    return this.users.getMyStats(userId);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser('sub') userId: string) {
    return this.users.listAddresses(userId);
  }

  @Post('me/addresses')
  createAddress(@CurrentUser('sub') userId: string, @Body() dto: AddressDto) {
    return this.users.createAddress(userId, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AddressDto,
  ) {
    return this.users.updateAddress(userId, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.users.deleteAddress(userId, id);
  }

  // ========== Admin: User & Staff Management ==========

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiOperation({ summary: '[Admin] Danh sách user, lọc theo role/status/search' })
  list(@Query() query: any) {
    return this.users.listUsers({
      role: query.role,
      status: query.status,
      search: query.q,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiOperation({ summary: '[Admin] Chi tiết user' })
  detail(@Param('id') id: string) {
    return this.users.getUserById(id);
  }

  @Post('staff')
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo nhân viên/quản lý/AI manager mới' })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.users.createStaff(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật user (đổi role/status/info)' })
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.users.updateStaff(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN)
  @ApiOperation({ summary: '[Admin] Vô hiệu hóa tài khoản (soft delete)' })
  deactivate(@Param('id') id: string) {
    return this.users.deactivateUser(id);
  }

  @Post(':id/loyalty')
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.STAFF)
  @ApiOperation({ summary: '[Admin/Staff] Điều chỉnh điểm tích lũy' })
  adjustLoyalty(@Param('id') id: string, @Body() dto: AdjustLoyaltyDto) {
    return this.users.adjustLoyalty(id, dto.delta, dto.reason);
  }
}
