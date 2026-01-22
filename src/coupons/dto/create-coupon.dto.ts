import { IsString, IsNumber, IsOptional, IsMongoId, Min, IsDateString } from 'class-validator';

export class CreateCouponDto {
  @IsMongoId()
  customerId!: string;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
