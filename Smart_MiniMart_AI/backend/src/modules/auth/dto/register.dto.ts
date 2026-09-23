import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(160)
  email: string;

  /**
   * SEC-026: tối thiểu 8 ký tự, phải có cả chữ và số, tối đa 72 ký tự
   * (bcrypt chỉ dùng 72 byte đầu — dài hơn sẽ bị cắt âm thầm).
   */
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s().]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}
