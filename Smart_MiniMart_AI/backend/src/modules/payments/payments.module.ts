import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VietQrService } from './vietqr.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, VietQrService],
  exports: [PaymentsService, VietQrService],
})
export class PaymentsModule {}
