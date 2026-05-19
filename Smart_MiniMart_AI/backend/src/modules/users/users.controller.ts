import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddressDto } from './dto/address.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật hồ sơ cá nhân' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(userId, dto);
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
}
