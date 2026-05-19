import { Module } from '@nestjs/common';
import { AIGatewayService } from './ai-gateway.service';
import { OCRClientService } from './ocr-client.service';
import { AIGatewayController } from './ai-gateway.controller';

import { DeepSeekProvider } from './providers/deepseek.provider';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';
import { MockProvider } from './providers/mock.provider';

import { RuleSearchEngine } from './rule-engine/rule-search.engine';
import { AISearchService } from './ai-search.service';
import { AIAssistantService } from './ai-assistant.service';

@Module({
  providers: [
    AIGatewayService,
    OCRClientService,
    DeepSeekProvider,
    OpenAICompatibleProvider,
    MockProvider,
    RuleSearchEngine,
    AISearchService,
    AIAssistantService,
  ],
  controllers: [AIGatewayController],
  exports: [AIGatewayService, OCRClientService, AISearchService, AIAssistantService],
})
export class AIGatewayModule {}
