import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Ảnh review: chỉ http(s) hoặc đường dẫn nội bộ "/uploads/..." */
const SAFE_URL_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;

export class CreateReviewDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  comment?: string;

  // SEC-026: giới hạn số ảnh + chỉ nhận URL hợp lệ (tránh nhúng scheme lạ / spam payload)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(SAFE_URL_RE, { each: true })
  imageUrls?: string[];
}
