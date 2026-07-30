import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class BroadcastNotificationDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @MinLength(2)
  body: string;

  @IsOptional()
  @IsString()
  type?: string; // ORDER | PROMOTION | EXPIRY | SYSTEM

  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  targetRoles?: Role[]; // If empty -> all users

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUserIds?: string[];
}
