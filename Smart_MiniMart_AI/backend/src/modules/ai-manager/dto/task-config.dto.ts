import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AITaskType, AIMode } from '@prisma/client';

export class UpdateTaskConfigDto {
  @IsEnum(AITaskType)
  taskType: AITaskType;

  @IsOptional()
  @IsString()
  primaryProviderId?: string;

  @IsOptional()
  @IsString()
  primaryModel?: string;

  @IsOptional()
  @IsString()
  fallbackProviderId?: string;

  @IsOptional()
  @IsString()
  fallbackModel?: string;

  @IsOptional()
  @IsEnum(AIMode)
  mode?: AIMode;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
