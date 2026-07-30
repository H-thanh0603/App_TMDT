import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportReceiptItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  rawProductName: string;

  @IsString()
  productName: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReceiptDto {
  @IsString()
  supplierName: string;

  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @IsDateString()
  importDate: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportReceiptItemDto)
  items: ImportReceiptItemDto[];
}

/** Body cho PATCH /import-receipts/:id/items — validate từng dòng (thay cho any[]). */
export class UpdateReceiptItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportReceiptItemDto)
  items: ImportReceiptItemDto[];
}
