import { Body, Controller, Get, Ip, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { VietQrService } from './vietqr.service';
import { CreateVnpayDto } from './dto/create-vnpay.dto';
import { CreateVietQrDto } from './dto/create-vietqr.dto';
import { ConfirmVietQrDto } from './dto/confirm-vietqr.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SkipTransform } from '@/common/decorators/skip-transform.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private payments: PaymentsService,
    private vietqr: VietQrService,
    private cfg: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('vnpay/create')
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPay sandbox' })
  createVnpay(@CurrentUser('sub') userId: string, @Body() dto: CreateVnpayDto, @Ip() ip: string) {
    return this.payments.createVnpayUrl(userId, dto, ip);
  }

  @Public()
  @Get('vnpay/return')
  @ApiOperation({
    summary: 'VNPay return URL - CHỈ verify chữ ký + hiển thị kết quả (không đổi trạng thái)',
  })
  vnpayReturn(@Query() query: Record<string, string>) {
    return this.payments.handleVnpayReturn(query);
  }

  @Public()
  @SkipTransform()
  @Get('vnpay/ipn')
  @ApiOperation({ summary: 'VNPay IPN - server-to-server, nguồn xác nhận thanh toán duy nhất' })
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.payments.handleVnpayIpn(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('vietqr/create')
  @ApiOperation({ summary: 'Tạo VietQR tĩnh cho đơn (thanh toán chuyển khoản)' })
  createVietQr(@CurrentUser('sub') userId: string, @Body() dto: CreateVietQrDto) {
    return this.vietqr.generate(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.STORE_ADMIN)
  @Post('vietqr/:orderId/confirm')
  @ApiOperation({ summary: 'Xác nhận thủ công giao dịch VietQR' })
  confirmVietQr(
    @Param('orderId') orderId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ConfirmVietQrDto,
  ) {
    return this.vietqr.confirm(orderId, userId, dto);
  }
}
