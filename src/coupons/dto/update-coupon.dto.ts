import { IsBoolean, IsNumber, IsOptional, IsString, Min, IsDateString } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
