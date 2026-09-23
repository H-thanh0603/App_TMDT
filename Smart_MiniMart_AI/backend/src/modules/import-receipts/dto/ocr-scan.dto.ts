import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { OCREngine } from '@prisma/client';

/** Ảnh phiếu nhập: URL http(s) công khai hoặc đường dẫn nội bộ /uploads/... */
const IMAGE_URL_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;

export class OCRScanDto {
  @IsString()
  @MinLength(4)
  @MaxLength(2_048)
  @Matches(IMAGE_URL_RE, { message: 'imageUrl không hợp lệ' })
  imageUrl: string;

  @IsOptional()
  @IsEnum(OCREngine)
  engine?: OCREngine;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplierName?: string;
}
