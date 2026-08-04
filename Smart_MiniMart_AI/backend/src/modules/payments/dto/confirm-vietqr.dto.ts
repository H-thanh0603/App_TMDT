import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConfirmVietQrDto {
  @IsString()
  @MinLength(3)
  bankTransactionRef: string;

  @IsOptional()
  @IsString()
  note?: string;
}
