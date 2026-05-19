import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AIProviderType, AIProviderStatus } from '@prisma/client';

export class CreateProviderDto {
  @IsString()
  name: string;

  @IsEnum(AIProviderType)
  type: AIProviderType;

  @IsOptional() @IsString()
  baseUrl?: string;

  @IsOptional() @IsString()
  apiKey?: string;

  @IsOptional() @IsString()
  defaultModel?: string;

  @IsOptional() @IsEnum(AIProviderStatus)
  status?: AIProviderStatus;

  @IsOptional() @IsBoolean()
  isSystemDefault?: boolean;
}

export class UpdateProviderDto extends CreateProviderDto {}
