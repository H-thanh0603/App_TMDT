import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OCREngine } from '@prisma/client';

export class OCRScanDto {
  @IsString()
  imageUrl: string;

  @IsOptional() @IsEnum(OCREngine)
  engine?: OCREngine;

  @IsOptional() @IsString()
  supplierName?: string;
}
