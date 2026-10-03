import { IsOptional, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpsertSettingDto {
  @IsString()
  key: string;

  @IsOptional()
  value?: Prisma.InputJsonValue;

  @IsOptional()
  @IsString()
  description?: string;
}
