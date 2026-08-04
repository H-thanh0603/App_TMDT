import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AITaskType, Role } from '@prisma/client';

import { AIManagerService } from './ai-manager.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { UpdateTaskConfigDto } from './dto/task-config.dto';
import { UpdateOCRSettingsDto } from './dto/ocr-settings.dto';
import { UpsertPromptTemplateDto } from './dto/prompt-template.dto';
import { UpdateUsageLimitDto } from './dto/usage-limit.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('AI Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AI_MANAGER)
@Controller('ai-manager')
export class AIManagerController {
  constructor(private aiManager: AIManagerService) {}

  @Get('overview')
  @ApiOperation({ summary: 'AI Control Center — overview' })
  overview() {
    return this.aiManager.getOverview();
  }

  // -------- Providers --------
  @Get('providers')
  listProviders() {
    return this.aiManager.listProviders();
  }

  @Post('providers')
  createProvider(@Body() dto: CreateProviderDto) {
    return this.aiManager.createProvider(dto);
  }

  @Patch('providers/:id')
  updateProvider(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.aiManager.updateProvider(id, dto);
  }

  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) {
    return this.aiManager.deleteProvider(id);
  }

  @Post('providers/:id/test')
  testProvider(@Param('id') id: string) {
    return this.aiManager.testProvider(id);
  }

  // -------- Task configs --------
  @Get('task-configs')
  listTaskConfigs() {
    return this.aiManager.listTaskConfigs();
  }

  @Patch('task-configs')
  upsertTaskConfig(@Body() dto: UpdateTaskConfigDto) {
    return this.aiManager.upsertTaskConfig(dto);
  }

  // -------- OCR settings --------
  @Get('ocr-settings')
  getOCRSettings() {
    return this.aiManager.getOCRSettings();
  }

  @Patch('ocr-settings')
  updateOCRSettings(@Body() dto: UpdateOCRSettingsDto) {
    return this.aiManager.updateOCRSettings(dto);
  }

  @Get('prompt-templates')
  listPromptTemplates() {
    return this.aiManager.listPromptTemplates();
  }

  @Post('prompt-templates')
  upsertPromptTemplate(@Body() dto: UpsertPromptTemplateDto) {
    return this.aiManager.upsertPromptTemplate(dto);
  }

  @Delete('prompt-templates/:id')
  deletePromptTemplate(@Param('id') id: string) {
    return this.aiManager.deletePromptTemplate(id);
  }

  @Get('usage-limits')
  listUsageLimits() {
    return this.aiManager.listUsageLimits();
  }

  @Patch('usage-limits')
  updateUsageLimit(@Body() dto: UpdateUsageLimitDto) {
    return this.aiManager.updateUsageLimit(dto);
  }

  @Post('playground')
  playground(@Body() dto: { taskType: AITaskType; prompt: string; providerId?: string }) {
    return this.aiManager.playground(dto);
  }

  // -------- Logs --------
  @Get('logs')
  listLogs(
    @Query('taskType') taskType?: AITaskType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiManager.listLogs(
      taskType,
      limit ? parseInt(limit, 10) : 50,
      page ? parseInt(page, 10) : 1,
    );
  }
}
