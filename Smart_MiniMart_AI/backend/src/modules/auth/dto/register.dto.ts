import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(64)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
