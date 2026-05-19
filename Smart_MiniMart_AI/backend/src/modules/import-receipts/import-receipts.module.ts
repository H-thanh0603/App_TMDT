import { Module } from '@nestjs/common';
import { ImportReceiptsService } from './import-receipts.service';
import { ImportReceiptsController } from './import-receipts.controller';
import { AIGatewayModule } from '@/modules/ai-gateway/ai-gateway.module';

@Module({
  imports: [AIGatewayModule],
  providers: [ImportReceiptsService],
  controllers: [ImportReceiptsController],
  exports: [ImportReceiptsService],
})
export class ImportReceiptsModule {}
