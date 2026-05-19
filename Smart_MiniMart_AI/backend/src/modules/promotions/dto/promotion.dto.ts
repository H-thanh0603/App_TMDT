import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { PromotionType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsNumber() @Min(0)
  discountValue: number;

  @IsOptional() @IsNumber() @Min(0)
  minOrderValue?: number;

  @IsOptional() @IsNumber() @Min(0)
  maxDiscount?: number;

  @IsOptional() @IsNumber() @Min(0)
  usageLimit?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsBoolean()
  isAutoApply?: boolean;

  @IsOptional() @IsArray() @IsString({ each: true })
  productIds?: string[];
}

export class UpdatePromotionDto extends CreatePromotionDto {}
