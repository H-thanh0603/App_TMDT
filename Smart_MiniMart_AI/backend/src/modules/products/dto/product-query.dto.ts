import { IsBooleanString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsBooleanString()
  inStock?: string;

  @IsOptional()
  @IsBooleanString()
  isFeatured?: string;

  @IsOptional()
  @IsBooleanString()
  onSale?: string;

  /** Admin: include inactive products when true */
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'name';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
