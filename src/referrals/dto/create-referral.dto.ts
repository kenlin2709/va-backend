import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { ReferralDiscountType } from '../schemas/referral.schema';

export class CreateReferralDto {
  @IsString()
  name!: string;

  @IsIn(['percent', 'amount'])
  discountType!: ReferralDiscountType;

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}





