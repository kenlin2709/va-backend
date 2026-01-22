import { Type } from 'class-transformer';
import { IsArray, IsInt, IsMongoId, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  shippingName?: string;

  @IsOptional()
  @IsString()
  shippingAddress1?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingState?: string;

  @IsOptional()
  @IsString()
  shippingPostcode?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  couponCodes?: string[];
}


