import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AITaskType } from '@prisma/client';

export class UpsertPromptTemplateDto {
  @IsEnum(AITaskType)
  taskType: AITaskType;

  @IsString()
  name: string;

  @IsString()
  systemPrompt: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  userTemplate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
