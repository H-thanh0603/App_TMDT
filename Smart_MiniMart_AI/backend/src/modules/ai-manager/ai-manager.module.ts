import { Module } from '@nestjs/common';
import { AIManagerService } from './ai-manager.service';
import { AIManagerController } from './ai-manager.controller';

@Module({
  providers: [AIManagerService],
  controllers: [AIManagerController],
  exports: [AIManagerService],
})
export class AIManagerModule {}
