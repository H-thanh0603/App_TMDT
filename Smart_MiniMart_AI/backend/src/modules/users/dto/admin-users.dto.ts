import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

/** Ảnh/URL do client gửi: chỉ http(s) hoặc đường dẫn nội bộ "/uploads/..." */
const SAFE_URL_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;

export class CreateStaffDto {
  @IsEmail() @MaxLength(160) email: string;

  // SEC-026: cùng chuẩn mật khẩu với đăng ký khách hàng
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName: string;

  @IsOptional() @IsString() @Matches(/^[0-9+\-\s().]{8,20}$/) phone?: string;

  @IsOptional() @IsString() @MaxLength(500) @Matches(SAFE_URL_RE) avatarUrl?: string;

  @IsEnum(Role)
  role: Role; // STAFF | STORE_ADMIN | AI_MANAGER | CUSTOMER

  @IsOptional() @IsBoolean() isVip?: boolean;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) fullName?: string;
  @IsOptional() @IsString() @Matches(/^[0-9+\-\s().]{8,20}$/) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) @Matches(SAFE_URL_RE) avatarUrl?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsBoolean() isVip?: boolean;
}

export class AdjustLoyaltyDto {
  /** Dương = cộng điểm, âm = trừ điểm. Có trần để tránh staff tự cộng điểm vô hạn. */
  @IsInt()
  @Min(-10_000)
  @Max(10_000)
  delta: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
