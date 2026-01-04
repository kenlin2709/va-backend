import { Transform } from 'class-transformer';
import { IsInt, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(({ value }) => (value === '' || value === undefined ? value : Number(value)))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'productImageUrl must be a valid URL' })
  productImageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  disclaimer?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @Min(0)
  @Max(1_000_000)
  stockQty?: number;
}
