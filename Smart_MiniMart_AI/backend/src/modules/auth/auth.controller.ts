import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService, SessionMeta } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotDto, ResetDto, MfaLoginDto, MfaCodeDto } from './dto/mfa.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

/** Gộp user-agent + IP client thành metadata phiên (lưu vào refresh_tokens để audit). */
function sessionMeta(userAgent?: string, ip?: string): SessionMeta {
  return { userAgent, ip };
}

@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng mới' })
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.auth.register(dto, sessionMeta(userAgent, ip));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập' })
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string, @Ip() ip?: string) {
    return this.auth.login(dto, sessionMeta(userAgent, ip));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent?: string, @Ip() ip?: string) {
    return this.auth.refresh(dto.refreshToken, sessionMeta(userAgent, ip));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất (revoke refresh token)' })
  logout(@CurrentUser('sub') userId: string, @Body() dto: RefreshDto) {
    return this.auth.logout(userId, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất mọi thiết bị (thu hồi toàn bộ phiên)' })
  logoutAll(@CurrentUser('sub') userId: string) {
    return this.auth.logoutAll(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Thông tin tài khoản hiện tại' })
  me(@CurrentUser('sub') userId: string) {
    return this.auth.getProfile(userId);
  }

  // Q23: quên mật khẩu — throttle chặt (5/phút) chống dò email.
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Xin link đặt lại mật khẩu' })
  forgot(@Body() dto: ForgotDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token' })
  reset(@Body() dto: ResetDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  // Q29: MFA TOTP.
  @Public()
  @Post('mfa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bước 2 đăng nhập MFA' })
  mfaLogin(
    @Body() dto: MfaLoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.auth.loginMfa(dto.userId, dto.code, sessionMeta(userAgent, ip));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/setup')
  @ApiOperation({ summary: 'Tạo secret MFA + recovery code' })
  mfaSetup(@CurrentUser('sub') userId: string) {
    return this.auth.setupMfa(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/verify')
  @ApiOperation({ summary: 'Xác nhận bật MFA' })
  mfaVerify(@CurrentUser('sub') userId: string, @Body() dto: MfaCodeDto) {
    return this.auth.verifyMfaSetup(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/disable')
  @ApiOperation({ summary: 'Tắt MFA' })
  mfaDisable(@CurrentUser('sub') userId: string) {
    return this.auth.disableMfa(userId);
  }
}
