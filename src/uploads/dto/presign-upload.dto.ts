import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  // optional folder prefix inside the bucket (e.g. "products")
  @IsOptional()
  @IsString()
  folder?: string;
}




