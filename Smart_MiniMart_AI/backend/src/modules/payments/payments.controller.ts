import {
  Body, Controller, Get, Ip, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateVnpayDto } from './dto/create-vnpay.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('vnpay/create')
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPay sandbox' })
  createVnpay(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVnpayDto,
    @Ip() ip: string,
  ) {
    return this.payments.createVnpayUrl(userId, dto, ip);
  }

  @Public()
  @Get('vnpay/return')
  @ApiOperation({ summary: 'VNPay return URL - verify chữ ký + cập nhật đơn' })
  vnpayReturn(@Query() query: any) {
    return this.payments.handleVnpayReturn(query);
  }
}
