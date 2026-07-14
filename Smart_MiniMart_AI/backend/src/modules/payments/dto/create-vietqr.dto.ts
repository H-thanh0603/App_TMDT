import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateVietQrDto {
  @IsString()
  orderId: string;

  // Nếu không truyền, dùng STK mặc định cấu hình trong env
  @IsOptional()
  @IsString()
  bankBin?: string;

  @IsOptional()
  @IsString()
  accountNo?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsIn(['compact', 'qr_only', 'print'])
  template?: 'compact' | 'qr_only' | 'print';
}
