import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ForgotDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(160)
  email: string;
}

export class ResetDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số',
  })
  newPassword: string;
}

export class MfaLoginDto {
  @IsString()
  userId: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  code: string;
}

export class MfaCodeDto {
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  code: string;
}
