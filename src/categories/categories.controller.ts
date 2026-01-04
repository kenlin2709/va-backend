import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(@Body() dto: CreateCategoryDto, @UploadedFile() image?: Express.Multer.File) {
    if (image && !image.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    return this.categoriesService.create(dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @UploadedFile() image?: Express.Multer.File) {
    if (image && !image.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    return this.categoriesService.update(id, dto, image);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}


