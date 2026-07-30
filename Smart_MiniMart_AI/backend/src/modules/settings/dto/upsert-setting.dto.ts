import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  key: string;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  description?: string;
}
