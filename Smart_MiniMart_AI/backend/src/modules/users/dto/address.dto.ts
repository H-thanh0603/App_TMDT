import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddressDto {
  @IsString()
  @MinLength(2)
  recipient: string;

  @IsString()
  @MinLength(8)
  @MaxLength(15)
  phone: string;

  @IsString()
  @MinLength(2)
  line1: string;

  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
