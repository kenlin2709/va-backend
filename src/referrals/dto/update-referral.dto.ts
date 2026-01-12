import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { ReferralDiscountType } from '../schemas/referral.schema';

export class UpdateReferralDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['percent', 'amount'])
  discountType?: ReferralDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}



