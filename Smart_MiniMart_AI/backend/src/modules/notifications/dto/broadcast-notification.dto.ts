import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class BroadcastNotificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1_000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string; // ORDER | PROMOTION | EXPIRY | SYSTEM

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(Role, { each: true })
  targetRoles?: Role[]; // If empty -> all users

  // SEC-027: chặn broadcast tới hàng trăm nghìn id trong 1 request (DoS createMany)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1_000)
  @IsString({ each: true })
  targetUserIds?: string[];
}
