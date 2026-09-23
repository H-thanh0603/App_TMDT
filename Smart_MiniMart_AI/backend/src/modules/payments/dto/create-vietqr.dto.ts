import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CreateVietQrDto {
  @IsString()
  orderId: string;

  /**
   * Ghi đè STK/ngân hàng CHỈ có hiệu lực với STORE_ADMIN (SEC-023).
   * Với khách hàng, các trường này bị bỏ qua ở service.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,11}$/, { message: 'bankBin phải là 6-11 chữ số (NAPAS BIN)' })
  bankBin?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9A-Za-z._-]{4,32}$/, { message: 'accountNo không hợp lệ' })
  accountNo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N} .,_'-]{2,60}$/u, { message: 'accountName không hợp lệ' })
  accountName?: string;

  @IsOptional()
  @IsIn(['compact', 'qr_only', 'print'])
  template?: 'compact' | 'qr_only' | 'print';
}
