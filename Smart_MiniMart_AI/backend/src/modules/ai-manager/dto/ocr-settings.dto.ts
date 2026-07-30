import { IsBoolean, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { OCREngine } from '@prisma/client';

export class UpdateOCRSettingsDto {
  @IsOptional()
  @IsEnum(OCREngine)
  defaultEngine?: OCREngine;

  @IsOptional()
  @IsEnum(OCREngine)
  fallbackEngine?: OCREngine;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsBoolean()
  requireReview?: boolean;

  @IsOptional()
  @IsBoolean()
  llmParserEnabled?: boolean;
}
