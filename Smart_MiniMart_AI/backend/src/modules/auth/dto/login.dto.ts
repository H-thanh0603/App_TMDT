import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(160)
  email: string;

  // MaxLength: chặn payload khổng lồ làm tốn CPU khi bcrypt.compare (SEC-026).
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
