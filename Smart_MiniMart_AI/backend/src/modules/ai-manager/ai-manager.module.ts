import { Module } from '@nestjs/common';
import { AIManagerService } from './ai-manager.service';
import { AIManagerController } from './ai-manager.controller';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [AIGatewayModule],
  providers: [AIManagerService],
  controllers: [AIManagerController],
  exports: [AIManagerService],
})
export class AIManagerModule {}
