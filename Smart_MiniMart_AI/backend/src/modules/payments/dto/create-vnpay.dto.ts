import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateVnpayDto {
  @IsString() orderId: string;
  @IsOptional() @IsString() bankCode?: string; // VNBANK | INTCARD | VNPAYQR | empty
  @IsOptional() @IsString() locale?: string; // vn | en
  @IsOptional() @IsUrl({ require_tld: false }) returnUrl?: string;
}
