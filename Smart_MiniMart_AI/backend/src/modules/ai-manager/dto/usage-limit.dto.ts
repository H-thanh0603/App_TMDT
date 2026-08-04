import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUsageLimitDto {
  @IsString()
  providerId: string;

  @IsOptional() @IsNumber() @Min(0)
  monthlyRequestLimit?: number;

  @IsOptional() @IsNumber() @Min(0)
  monthlyCostLimitUsd?: number;

  @IsOptional() @IsBoolean()
  isEnforced?: boolean;
}
