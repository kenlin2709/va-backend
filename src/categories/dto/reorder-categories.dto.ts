import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderCategoriesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  orderedIds!: string[];
}
