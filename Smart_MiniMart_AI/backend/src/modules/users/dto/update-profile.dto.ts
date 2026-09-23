import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** URL ảnh: chỉ http(s) hoặc đường dẫn nội bộ, chặn scheme lạ (data:, javascript:...) */
const SAFE_URL_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s().]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL_RE, { message: 'avatarUrl không hợp lệ' })
  avatarUrl?: string;
}
