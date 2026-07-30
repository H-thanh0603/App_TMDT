import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

export class CreateStaffDto {
  @IsEmail() email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;

  @IsEnum(Role)
  role: Role; // STAFF | STORE_ADMIN | AI_MANAGER | CUSTOMER

  @IsOptional() @IsBoolean() isVip?: boolean;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsBoolean() isVip?: boolean;
}

export class AdjustLoyaltyDto {
  @IsInt()
  delta: number; // positive = thêm, negative = trừ

  @IsOptional()
  @IsString()
  reason?: string;
}
