import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'categoryImageUrl must be a valid URL' })
  categoryImageUrl?: string;
}


