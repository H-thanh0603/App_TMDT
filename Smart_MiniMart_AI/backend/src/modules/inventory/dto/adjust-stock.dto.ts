import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { InventoryTxnType } from '@prisma/client';

export class AdjustStockDto {
  @IsString()
  productId: string;

  @IsInt()
  delta: number; // dương = nhập thêm, âm = giảm

  @IsEnum(InventoryTxnType)
  type: InventoryTxnType;

  @IsOptional()
  @IsString()
  reason?: string;
}
