import { Transform } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListProductsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}
