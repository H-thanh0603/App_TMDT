import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { InventoryTxnType } from '@prisma/client';

export class AdjustStockDto {
  @IsString()
  productId: string;

  // Trần/đáy để tránh một request đẩy tồn kho lên giá trị phi lý (vẫn ghi audit log)
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  delta: number; // dương = nhập thêm, âm = giảm

  @IsEnum(InventoryTxnType)
  type: InventoryTxnType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
