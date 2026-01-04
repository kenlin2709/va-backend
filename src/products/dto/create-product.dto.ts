import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith('[')) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return undefined;
    }
  }
  // Comma separated fallback
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

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
  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  categoryIds?: string[];

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
