import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

import { AISearchService } from './ai-search.service';
import { AIAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

class AISearchDto {
  @IsString()
  @MinLength(2)
  query: string;
}

class AIChatDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsArray()
  history?: any[];
}

@ApiTags('AI')
@Controller('ai')
export class AIGatewayController {
  constructor(
    private aiSearch: AISearchService,
    private aiAssistant: AIAssistantService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('search')
  @ApiOperation({ summary: 'AI Search bằng mô tả tự nhiên (yêu cầu đăng nhập, giới hạn tần suất)' })
  search(@Body() dto: AISearchDto, @CurrentUser('sub') userId: string) {
    return this.aiSearch.search(dto.query, userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('chat')
  @ApiOperation({ summary: 'AI Shopping Assistant — chat tư vấn' })
  chat(@Body() dto: AIChatDto, @CurrentUser('sub') userId: string) {
    return this.aiAssistant.chat(dto.message, userId, dto.history ?? []);
  }
}
