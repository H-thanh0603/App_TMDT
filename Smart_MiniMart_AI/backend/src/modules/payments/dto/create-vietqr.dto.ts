import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateVietQrDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  // Nếu không truyền, dùng STK mặc định cấu hình trong env
  @IsString()
  bankBin?: string;

  @IsString()
  accountNo?: string;

  @IsString()
  accountName?: string;

  @IsIn(['compact', 'qr_only', 'print'])
  template?: 'compact' | 'qr_only' | 'print';
}
